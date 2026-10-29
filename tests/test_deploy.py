"""Isolated installer regressions. All system paths are rewritten into a temp dir.
Nginx/HTTP/package commands are simulated; only the test-owned socket is stopped.
Run: python -m unittest discover -s tests -p 'test_deploy.py' -v
"""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import sys

ROOT = Path(__file__).resolve().parents[1]

class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='study-deploy-')
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.upload = self.base / 'upload'
        shutil.copytree(ROOT / 'dist', self.upload)
        self.live = self.base / 'live'
        self.config = self.base / 'etc/nginx/conf.d/study-room-9001.conf'
        self.config.parent.mkdir(parents=True)
        (self.config.parent.parent / 'mime.types').write_text('types { text/html html; }')
        self.bin = self.base / 'bin'; self.bin.mkdir()
        self.env = {**os.environ, 'PATH': str(self.bin)+':'+os.environ['PATH'], 'CASE': str(self.base)}
        self.script = self.base / 'deploy.sh'
        text = (ROOT / 'deploy-study-room.sh').read_text()
        for original,replacement in [('/var/www/study-room',str(self.live)),('/etc/nginx',str(self.base/'etc/nginx')),('/var/backups/study-room',str(self.base/'backups')),('/run/lock',str(self.base/'lock')),('/run/systemd/system',str(self.base/'systemd'))]:
            text = text.replace(original,replacement)
        # This test never targets system paths; permit it to run without root too.
        text=text.replace("((EUID == 0)) || fail 'Run with sudo bash deploy-study-room.sh ...'", ':')
        self.script.write_text(text)
        self.mock('nginx', '''
echo "$*" >> "$CASE/nginx-calls"
if [[ "$1" == -t && -e "$CASE/bad-config" && -e "$CASE/etc/nginx/conf.d/study-room-9001.conf" ]]; then exit 1; fi
if [[ "$1" == -T ]]; then
 if [[ ! -e "$CASE/omit-include" ]]; then echo "# configuration file $CASE/etc/nginx/conf.d/study-room-9001.conf:"; fi
fi
''')
        self.mock('pgrep','exit 0')
        self.mock('getenforce','echo Disabled')
        self.mock('ss','exit 0')
        self.mock('sleep','exit 0')
        self.mock('lsof', '''
if [[ -n "${TEST_PID:-}" && -r /proc/$TEST_PID/cmdline && -n "$(tr '\\0' ' ' < /proc/$TEST_PID/cmdline)" ]]; then echo "$TEST_PID"; fi
''')
        self.mock('curl', '''
if [[ "$*" == *-fsSI* ]]; then echo 'X-Study-Room-Backend: managed-9001';exit 0;fi
if [[ -e "$CASE/bad-health" ]]; then echo 'wrong site';exit 0;fi
url=${!#}
if [[ "$url" == */content.json ]]; then cat "$CASE/live/current/content.json"; else cat "$CASE/live/current/index.html";fi
''')
        # An accidental package install would fail rather than change the machine.
        self.mock('apt-get', 'echo UNEXPECTED-INSTALL >&2;exit 99')
        self.mock('dnf', 'echo UNEXPECTED-INSTALL >&2;exit 99')

    def mock(self,name,body):
        p=self.bin/name;p.write_text('#!/usr/bin/env bash\nset -eu\n'+body+'\n');p.chmod(0o755)

    def run_deploy(self,*args,ok=True):
        result=subprocess.run(['bash',str(self.script),'--source',str(self.upload),'--domain','revise.example.com',*args],env=self.env,text=True,capture_output=True,timeout=15)
        if ok:self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        else:self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        return result

    def listener(self):
        child=subprocess.Popen([sys.executable,'-u','-c',"import socket,time;s=socket.socket();s.bind(('127.0.0.1',0));s.listen();print(s.getsockname()[1],flush=True);time.sleep(60)"],stdout=subprocess.PIPE,text=True)
        port=child.stdout.readline().strip()
        self.script.write_text(self.script.read_text().replace('PORT=9001','PORT='+port))
        self.env['TEST_PID']=str(child.pid)
        def stop():
            if child.poll() is None: child.terminate()
            child.wait();child.stdout.close()
        self.addCleanup(stop)
        return child

    def test_dry_run_does_not_create_live_paths(self):
        self.assertIn('DRY RUN',self.run_deploy('--dry-run').stdout)
        self.assertFalse(self.live.exists());self.assertFalse(self.config.exists())

    def test_install_and_repeat_update_only_copy_public_files(self):
        (self.upload/'downloads/private-secret.txt').write_text('must not publish')
        self.run_deploy();first=os.readlink(self.live/'current')
        self.assertFalse((self.live/'current/downloads/private-secret.txt').exists())
        self.assertFalse((self.live/'current/deploy-study-room.sh').exists())
        self.assertEqual((self.live/'current/index.html').read_bytes(),(self.upload/'index.html').read_bytes())
        self.run_deploy();self.assertNotEqual(first,os.readlink(self.live/'current'));self.assertTrue(Path(first).is_dir())
        self.assertIn('listen 127.0.0.1:9001;',self.config.read_text())

    def test_tampered_upload_and_omitted_checksums_are_rejected(self):
        (self.upload/'app.js').write_text('tampered')
        self.assertIn('checksum failed',self.run_deploy('--dry-run',ok=False).stderr)
        shutil.copyfile(ROOT/'dist/app.js',self.upload/'app.js')
        p=self.upload/'SHA256SUMS';p.write_text('\n'.join(x for x in p.read_text().splitlines() if not x.endswith('  app.js'))+'\n')
        self.assertIn('checksum for app.js',self.run_deploy('--dry-run',ok=False).stderr)

    def test_domain_injection_and_invalid_yes_are_rejected(self):
        self.run_deploy('--domain','https://bad.example/path',ok=False)
        self.run_deploy('--domain','a..example',ok=False)
        self.run_deploy('--yes',ok=False)
        self.assertFalse(self.live.exists())

    def test_failed_new_config_rolls_back_without_leaving_a_listener_config(self):
        (self.base/'bad-config').touch()
        self.run_deploy(ok=False)
        self.assertFalse(self.config.exists());self.assertFalse((self.live/'current').exists())

    def test_health_failure_restores_previous_release_and_config(self):
        self.run_deploy();previous=os.readlink(self.live/'current');config=self.config.read_bytes()
        (self.base/'bad-health').touch()
        self.assertIn('restoring',self.run_deploy(ok=False).stderr)
        self.assertEqual(os.readlink(self.live/'current'),previous);self.assertEqual(self.config.read_bytes(),config)

    def test_config_not_included_by_nginx_is_rejected_and_restored(self):
        (self.base/'omit-include').touch()
        self.assertIn('does not include',self.run_deploy(ok=False).stderr)
        self.assertFalse(self.config.exists())

    def test_unrecognised_existing_configuration_is_not_overwritten(self):
        self.config.write_text('# someone else owns this\n')
        self.run_deploy(ok=False);self.assertEqual(self.config.read_text(),'# someone else owns this\n')

    def test_listener_without_authorisation_is_not_stopped(self):
        child=self.listener();self.assertIn('Nothing was stopped',self.run_deploy(ok=False).stderr);self.assertIsNone(child.poll())

    def test_explicit_free_port_stops_only_the_test_owned_socket(self):
        child=self.listener();self.run_deploy('--free-port','--yes');self.assertEqual(child.wait(timeout=2),-15)

    def test_protected_process_is_not_stopped_even_with_authorisation(self):
        child=self.listener();self.mock('ps','echo nginx')
        self.assertIn('protected/shared',self.run_deploy('--free-port','--yes',ok=False).stderr);self.assertIsNone(child.poll())

    def test_installs_only_missing_dependency_without_upgrading_nginx(self):
        # Simulate lsof being absent while keeping the real machine untouched.
        # First lookup is missing; apt installs the saved mock during this test.
        (self.base/'lsof-template').write_text((self.bin/'lsof').read_text())
        (self.bin/'lsof').unlink()
        # command -v must not fall back to the host's lsof on developer machines.
        if shutil.which('lsof'): self.skipTest('Host lsof exists; dependency discovery is exercised in a minimal environment')
        self.mock('apt-get', '''
echo "$*" >> "$CASE/apt-calls"
if [[ "$1" == install ]]; then cp "$CASE/lsof-template" "$CASE/bin/lsof";chmod +x "$CASE/bin/lsof";fi
''')
        self.run_deploy()
        calls=(self.base/'apt-calls').read_text()
        self.assertIn('--no-upgrade',calls);self.assertIn('lsof',calls);self.assertNotIn('nginx',calls);self.assertNotIn('curl',calls)

    def test_symlinked_downloads_are_rejected(self):
        (self.upload/'downloads/unsafe.pdf').symlink_to('/etc/passwd')
        self.assertIn('Symlinks',self.run_deploy('--dry-run',ok=False).stderr)

if __name__=='__main__':unittest.main()
