from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1800, 1400
out = Path(__file__).resolve().parents[1] / "classroom-allotter-system-design.png"
im = Image.new("RGB", (W, H), "#f7f9fc")
d = ImageDraw.Draw(im)
font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
title = ImageFont.truetype(bold, 42)
head = ImageFont.truetype(bold, 27)
body = ImageFont.truetype(font, 23)
small = ImageFont.truetype(font, 19)
ink, muted, line = "#10213a", "#40536e", "#60758f"

def label_center(coords, lines, first_bold=True, gap=7):
    x1,y1,x2,y2 = coords
    fonts = [head if first_bold and i == 0 else body for i in range(len(lines))]
    heights = [d.textbbox((0,0),s,font=f)[3] for s,f in zip(lines,fonts)]
    y = y1 + ((y2-y1) - sum(heights) - gap*(len(lines)-1))/2
    for s,f,h in zip(lines,fonts,heights):
        bb=d.textbbox((0,0),s,font=f)
        d.text(((x1+x2-(bb[2]-bb[0]))/2,y),s,font=f,fill=ink)
        y += h+gap

def box(coords, lines, fill, stroke):
    d.rounded_rectangle(coords, radius=25, fill=fill, outline=stroke, width=3)
    label_center(coords, lines)

def arrow(points, text=None, at=None):
    d.line(points, fill=line, width=4, joint="curve")
    x1,y1=points[-2]; x2,y2=points[-1]
    if abs(x2-x1) > abs(y2-y1):
        s=1 if x2>x1 else -1
        tip=[(x2,y2),(x2-15*s,y2-10),(x2-15*s,y2+10)]
    else:
        s=1 if y2>y1 else -1
        tip=[(x2,y2),(x2-10,y2-15*s),(x2+10,y2-15*s)]
    d.polygon(tip, fill=line)
    if text and at:
        d.text(at,text,font=small,fill=muted)

d.text((W/2,35),"CLASSROOM ALLOTTER · SYSTEM DESIGN",font=title,fill=ink,anchor="ma")
d.text((W/2,95),"One Node.js API, feature services, MongoDB, and separate photo storage",font=body,fill=muted,anchor="ma")

box((500,145,1300,260),["PEOPLE","Students · Class Representatives · Timetable Admin"],"#e8f0ff","#8aa8dc")
box((430,335,1370,485),["WEB BROWSER","Search rooms · Report empty room","Mark activity taken or release it early"],"#eaf7f1","#8bbda4")
box((360,565,1440,735),["EXPRESS API · NODE.JS","HTTP routes · JSON validation · permissions","Returns room status with source and timestamp"],"#fff3df","#e1b96d")

box((45,850,565,1065),["AVAILABILITY SEARCH","Check timetable + CR activities","Match full time range","Filter capacity and facilities"],"#eef4fc","#a9bed8")
box((645,850,1165,1065),["EMPTY-ROOM REPORTS","Save room, reporter, and time","Optional photo reference","Expire old observations"],"#eef4fc","#a9bed8")
box((1245,850,1765,1065),["CR ROOM ACTIVITIES","Rescheduled · Extra · Other","Record start and end time","Allow early release"],"#eef4fc","#a9bed8")

box((55,1160,440,1300),["EXPIRY JOB","Clear stale reports","Close ended activities"],"#fcecee","#d998a1")
box((520,1160,1280,1300),["MONGODB","rooms · timetableEntries · emptyReports","roomActivities · users"],"#e8f7ee","#8bbda4")
box((1360,1160,1755,1300),["IMAGE STORAGE","Photo files stored separately","MongoDB stores file reference"],"#f2ecff","#ad97d5")

arrow([(900,260),(900,335)])
arrow([(900,485),(900,565)])
d.text((930,510),"HTTP / JSON",font=small,fill=muted)
arrow([(900,735),(900,785),(305,785),(305,850)])
arrow([(900,735),(900,850)])
arrow([(900,735),(900,785),(1505,785),(1505,850)])
arrow([(305,1065),(305,1110),(800,1110),(800,1160)])
d.text((330,1080),"read room + timetable",font=small,fill=muted)
arrow([(905,1065),(905,1110),(900,1110),(900,1160)])
d.text((915,1080),"save report metadata",font=small,fill=muted)
arrow([(1505,1065),(1505,1115),(1150,1115),(1150,1160)])
d.text((1320,1080),"save activity",font=small,fill=muted)
arrow([(1165,955),(1205,955),(1205,1135),(1360,1135),(1360,1230)])
d.text((1175,925),"store photo",font=small,fill=muted)
arrow([(440,1230),(520,1230)])
d.text((445,1200),"expire",font=small,fill=muted)

d.text((W/2,1350),"Timetable-free ≠ confirmed empty: each result shows its source and freshness.",font=small,fill=muted,anchor="ma")
im.save(out, optimize=True)
print(out)
