"""Render readable A5 PDFs, with bookmarks, page numbers and clickable sources."""
import html,re
from pathlib import Path
import markdown,reportlab
from bs4 import BeautifulSoup,NavigableString
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A5
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,Table,TableStyle,KeepTogether
ROOT=Path(__file__).resolve().parents[1]
FONTDIR=Path(reportlab.__file__).parent/'fonts'
for name,file in [('Body','Vera.ttf'),('Body-Bold','VeraBd.ttf'),('Body-Italic','VeraIt.ttf'),('Body-BoldItalic','VeraBI.ttf')]:
 pdfmetrics.registerFont(TTFont(name,str(FONTDIR/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Body-Bold',italic='Body-Italic',boldItalic='Body-BoldItalic')
INK=colors.HexColor('#173a42');ACCENT=colors.HexColor('#006e66')
styles={
 'p':ParagraphStyle('p',fontName='Body',fontSize=9.5,leading=14,spaceAfter=8,textColor=colors.HexColor('#22343a'),splitLongWords=True),
 'h1':ParagraphStyle('h1',fontName='Body-Bold',fontSize=21,leading=26,spaceAfter=17,textColor=INK,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='Body-Bold',fontSize=14,leading=19,spaceBefore=16,spaceAfter=10,textColor=ACCENT,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='Body-Bold',fontSize=11,leading=15.5,spaceBefore=11,spaceAfter=7,textColor=INK,keepWithNext=True),
 'li':ParagraphStyle('li',fontName='Body',fontSize=9.5,leading=14,leftIndent=12,firstLineIndent=-8,spaceAfter=6),
 'code':ParagraphStyle('code',fontName='Body',fontSize=7.5,leading=11,spaceAfter=10),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=7.2,leading=10,spaceAfter=2),
}
class Doc(BaseDocTemplate):
 def afterFlowable(self,f):
  if hasattr(f,'bookmark'):
   key,level,title=f.bookmark
   self.canv.bookmarkPage(key); self.canv.addOutlineEntry(title,key,level=level,closed=False)
def footer(c,d):
 c.saveState();w,h=A5
 c.setStrokeColor(colors.HexColor('#bdd4d2'));c.line(30,29,w-30,29)
 c.setFont('Body',7);c.setFillColor(INK)
 c.drawString(30,18,'9488 • Papers 3 & 4 • Independent revision')
 c.drawRightString(w-30,18,str(d.page));c.restoreState()
def inline(n):
 if isinstance(n,NavigableString):return html.escape(str(n).replace('→',' -> ')).replace('☐','[ ]')
 inner=''.join(inline(ch) for ch in n.children)
 if n.name in ['strong','b']:return '<b>'+inner+'</b>'
 if n.name in ['em','i']:return '<i>'+inner+'</i>'
 if n.name=='br':return '<br/>'
 if n.name=='a':
  href=n.get('href','')
  if not href.startswith(('http:','https:','#')):href='https://github.com/automationarshadghazi/islamic-studies/blob/arena/ea2ab170-islamic-studies/'+href
  return f'<a href="{html.escape(href,quote=True)}" color="#006e66"><u>{inner}</u></a>'
 return inner

def render(path):
 soup=BeautifulSoup(markdown.markdown(path.read_text(),extensions=['tables','fenced_code']),'html.parser')
 story=[];counter=0
 for el in soup.children:
  if isinstance(el,NavigableString):continue
  tag=el.name
  if tag in ['h1','h2','h3','h4']:
   sty='h3' if tag=='h4' else tag
   p=Paragraph(inline(el),styles[sty]);counter+=1
   # A flat outline below the title avoids skipped heading levels.
   p.bookmark=(f'section-{counter}',0 if tag=='h1' else 1,el.get_text())
   story.append(p)
  elif tag in ['p','blockquote']:
   story.append(Paragraph(inline(el),styles['p']))
  elif tag in ['ul','ol']:
   for i,li in enumerate(el.find_all('li',recursive=False),1):
    prefix=f'{i}. ' if tag=='ol' else '• '
    story.append(Paragraph(prefix+inline(li),styles['li']))
  elif tag=='pre':
   for line in el.get_text().splitlines():story.append(Paragraph(html.escape(line),styles['code']))
  elif tag=='table':
   cells=[[Paragraph(inline(td),styles['cell']) for td in tr.find_all(['th','td'])] for tr in el.find_all('tr')]
   if cells:
    width=A5[0]-60
    t=Table(cells,colWidths=[width/len(cells[0])]*len(cells[0]),repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e5f1ef')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#c4d8d4')),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story.extend([t,Spacer(1,10)])
 output=path.with_suffix('.pdf')
 doc=Doc(str(output),pagesize=A5,rightMargin=30,leftMargin=30,topMargin=34,bottomMargin=42,title=soup.find('h1').get_text(),author='Independent Islamic Studies revision pack',allowSplitting=True)
 doc.addPageTemplates(PageTemplate(id='page',frames=[Frame(30,42,A5[0]-60,A5[1]-76,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=footer))
 doc.build(story)
 print(output.relative_to(ROOT))
if __name__=='__main__':
 for path in [ROOT/'README.md',*sorted((ROOT/'notes').glob('*.md'))]:render(path)
