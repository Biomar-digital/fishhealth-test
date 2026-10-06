# Same model, textures downsized (default 2048) to lower GPU memory use in After Effects
import sys, io
from pygltflib import GLTF2, BufferView
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]; maxs=int(sys.argv[3]) if len(sys.argv)>3 else 2048
g=GLTF2().load(src); blob=g.binary_blob(); new=bytearray(); remap={}
img_views={im.bufferView for im in g.images}
for i,bv in enumerate(g.bufferViews):          # rebuild buffer; re-encode image views
    data=blob[bv.byteOffset or 0:(bv.byteOffset or 0)+bv.byteLength]
    if i in img_views:
        im=[x for x in g.images if x.bufferView==i][0]; pil=Image.open(io.BytesIO(data))
        print("image",pil.size,pil.mode,im.mimeType,end=" -> ")
        if max(pil.size)>maxs:
            pil=pil.resize((maxs*pil.size[0]//max(pil.size),maxs*pil.size[1]//max(pil.size)),Image.LANCZOS)
        out=io.BytesIO()
        if pil.mode in ('RGBA','LA'): pil.save(out,'PNG',optimize=True); im.mimeType='image/png'
        else: pil.convert('RGB').save(out,'JPEG',quality=93,subsampling=0); im.mimeType='image/jpeg'
        data=out.getvalue(); print(pil.size,len(data)//1024,"KB")
    while len(new)%4: new+=b'\0'
    bv.byteOffset=len(new); bv.byteLength=len(data); new+=data
while len(new)%4: new+=b'\0'
g.buffers[0].byteLength=len(new); g.set_binary_blob(bytes(new)); g.save_binary(dst)
