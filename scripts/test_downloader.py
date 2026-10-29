"""Offline tests: no real source sites needed."""
import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from download_sources import download,valid_pdf
PDF=b'%PDF-1.7\nfixture only\n%%EOF\n'
class Reply:
 def __init__(self,data):self.data=data;self.url='https://example.org/file.pdf'
 def __enter__(self):return self
 def __exit__(self,*args):return False
 def read(self,*args):return self.data
class Tests(unittest.TestCase):
 def test_signature_and_end(self):
  self.assertTrue(valid_pdf(PDF));self.assertFalse(valid_pdf(b'<html>home</html>'));self.assertFalse(valid_pdf(b'%PDF-1.7\ntruncated'))
 def test_valid_download_and_reuse(self):
  with tempfile.TemporaryDirectory() as d:
   with patch('download_sources.urllib.request.urlopen',return_value=Reply(PDF)):
    result=download(dict(filename='x.pdf',url='https://example.org/x'),Path(d),2)
   self.assertEqual(result['status'],'downloaded');self.assertEqual(len(result['sha256']),64)
   self.assertEqual(download(dict(filename='x.pdf'),Path(d),2)['status'],'already_present')
 def test_html_redirect_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   with patch('download_sources.urllib.request.urlopen',return_value=Reply(b'<html>homepage</html>')),patch('download_sources.time.sleep'):
    result=download(dict(filename='x.pdf',url='https://example.org/x'),Path(d),2)
   self.assertEqual(result['status'],'failed');self.assertFalse((Path(d)/'x.pdf').exists())
 def test_network_failure_recorded(self):
  with tempfile.TemporaryDirectory() as d:
   with patch('download_sources.urllib.request.urlopen',side_effect=OSError('blocked')),patch('download_sources.time.sleep'):
    result=download(dict(filename='x.pdf',url='https://example.org/x'),Path(d),2)
   self.assertEqual(result['status'],'failed');self.assertIn('blocked',result['error'])
if __name__=='__main__':unittest.main()
