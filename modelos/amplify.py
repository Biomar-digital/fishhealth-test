# Amplify the mouth-appendage motion of an animation around its average pose (keeps timing and seamless loop)
import sys, re, numpy as np
from pygltflib import GLTF2
from skin import acc
src,dst,k=sys.argv[1],sys.argv[2],float(sys.argv[3]); CAP=np.radians(float(sys.argv[4]) if len(sys.argv)>4 else 75)
g=GLTF2().load(src); blob=bytearray(g.binary_blob()); a=g.animations[0]
MOUTH=re.compile(r'^joint(8|9|10|11|13|14|16|91|92|93|102|103|111|112|121)_[LR]$')
def qmul(p,q):
    x1,y1,z1,w1=p.T; x2,y2,z2,w2=q.T
    return np.stack([w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2, w1*w2-x1*x2-y1*y2-z1*z2],-1)
def qinv(q): return q*np.array([-1,-1,-1,1])
def put(i,arr):
    ac=g.accessors[i]; bv=g.bufferViews[ac.bufferView]; arr=arr.astype(np.float32); isz=arr.shape[1]*4; st=bv.byteStride or isz
    off=(bv.byteOffset or 0)+(ac.byteOffset or 0)
    for j in range(len(arr)): blob[off+j*st:off+j*st+isz]=arr[j].tobytes()
    if ac.min is not None: ac.min=arr.min(0).tolist(); ac.max=arr.max(0).tolist()
for c in a.channels:
    name=g.nodes[c.target.node].name.split(':')[-1]
    if c.target.path!='rotation' or not MOUTH.match(name): continue
    q=acc(g,a.samplers[c.sampler].output); q/=np.linalg.norm(q,axis=1,keepdims=True)
    q*=np.sign(np.sum(q*q[0],1))[:,None]                     # same hemisphere
    m=q.mean(0); m/=np.linalg.norm(m)
    d=qmul(np.repeat(qinv(m)[None],len(q),0),q)              # delta from average pose
    d*=np.sign(d[:,3:4]+1e-12); ang=2*np.arccos(np.clip(d[:,3],-1,1)); ax=d[:,:3]/np.maximum(np.linalg.norm(d[:,:3],axis=1,keepdims=True),1e-9)
    na=np.minimum(ang*k,CAP)
    nd=np.c_[ax*np.sin(na/2)[:,None],np.cos(na/2)]
    nq=qmul(np.repeat(m[None],len(q),0),nd)
    put(a.samplers[c.sampler].output,nq)
    if np.degrees(ang.max())>0.5: print("  %-11s recorrido %5.1f° -> %5.1f°"%(name,np.degrees(ang.max()),np.degrees(na.max())))
g.set_binary_blob(bytes(blob)); g.save_binary(dst)
