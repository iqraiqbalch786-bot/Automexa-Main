/**
 * Automexa hero sculpture: the Automexa "A" mark as a raymarched, art-directed object (original shader).
 * - The mark's open triangle, floating crossbar and apex node, built from signed distance fields:
 *   bevelled gold strokes with an engraved channel along each centreline, a black obsidian node that
 *   travels the frame as the page scrolls, and a dashed gold orbit (the "automation loop") around it.
 * - Pose comes from the page choreography (hero-mount.ts): yaw, explode (an exploded-diagram state where the
 *   strokes drift apart in depth) and node travel. The pointer tilts it; clicks send a gold pulse across it.
 * - Studio-lit metal: a procedural softbox environment reflected through a gold Fresnel term; obsidian uses
 *   a dielectric Fresnel so the node reads as polished black glass. One-sample AO darkens the joints.
 * - uWire turns it into a gold scan-line contour (used behind content); uAlpha fades the scene (premultiplied).
 */
export const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

export const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uScroll;
uniform vec3 uClick;
uniform vec3 uLayout;
uniform vec3 uGold;
uniform float uWire;
uniform float uAlpha;
uniform vec3 uPose;   // x = yaw (rad), y = explode 0..1, z = node travel around the frame (0..1, 0 = apex)

#define STEPS 72

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return length(pa-ba*h);}
// a 2D distance extruded into a slab with rounded (bevelled) edges
float slab(float d2,float z,float dz,float rr){vec2 e=vec2(d2+rr,abs(z)-dz+rr);return min(max(e.x,e.y),0.0)+length(max(e,0.0))-rr;}

const vec2 A0=vec2(0.0,1.0);
const vec2 B0=vec2(-1.06,-0.9);
const vec2 C0=vec2(1.06,-0.9);
const vec2 X0=vec2(-0.47,-0.27);
const vec2 X1=vec2(0.47,-0.27);
const float W=0.19;
const float DZ=0.2;
const float RR=0.065;

vec3 nodeP;
float mat;
float sc;
mat2 ry;
mat2 rx;

float bulge(float c,float w){float q=min(c/w,1.0);return 0.08*(1.0-q*q);}

vec2 perim(float s){
  s=fract(s)*3.0;
  if(s<1.0) return mix(A0,C0,s);
  if(s<2.0) return mix(C0,B0,s-1.0);
  return mix(B0,A0,s-2.0);
}

float mapObj(vec3 o){
  float ex=uPose.y;
  vec3 oL=o-vec3(-0.36,0.22,0.36)*ex;
  vec3 oR=o-vec3(0.36,0.22,-0.36)*ex;
  vec3 oB=o-vec3(0.0,-0.34,0.12)*ex;
  vec3 oX=o-vec3(0.0,0.06,0.62)*ex;
  float cL=sdSeg(oL.xy,A0,B0),cR=sdSeg(oR.xy,A0,C0),cB=sdSeg(oB.xy,B0,C0),cX=sdSeg(oX.xy,X0,X1);
  // pillowed strokes: each face bulges toward its centreline so the metal carries a gradient, not a flat fill
  float zL=DZ+bulge(cL,W),zR=DZ+bulge(cR,W),zB=DZ+bulge(cB,W),zX=DZ*0.82+bulge(cX,W*0.9);
  float d=min(min(slab(cL-W,oL.z,zL,RR),slab(cR-W,oR.z,zR,RR)),min(slab(cB-W,oB.z,zB,RR),slab(cX-W*0.9,oX.z,zX,RR)));
  // engraved channel along each stroke's ridge on the front face
  float g=min(min(length(vec2(cL,oL.z-zL)),length(vec2(cR,oR.z-zR))),min(length(vec2(cB,oB.z-zB)),length(vec2(cX,oX.z-zX))))-0.03;
  d=max(d,-g);
  mat=1.0;
  float dn=length(o-nodeP)-0.3;
  if(dn<d){d=dn;mat=2.0;}
  vec3 t=o;t.yz*=rot(1.2);t.xy*=rot(0.32);
  float R=1.52;
  float dr=length(vec2(length(t.xz)-R,t.y))-0.013;
  float k=44.0;
  float a=abs(fract((atan(t.z,t.x)+uTime*0.32)*k/6.2832)-0.5)-0.3;
  dr=max(dr,a*6.2832*R/k);
  if(dr<d){d=dr;mat=3.0;}
  return d;
}

float map(vec3 p){
  vec3 o=p/sc;
  o.xz*=ry;o.yz*=rx;
  return mapObj(o)*sc*0.8;
}

vec3 calcN(vec3 p){
  const vec2 k=vec2(1.,-1.);float h=0.0015;
  return normalize(k.xyy*map(p+k.xyy*h)+k.yyx*map(p+k.yyx*h)+k.yxy*map(p+k.yxy*h)+k.xxx*map(p+k.xxx*h));
}

float box(vec2 p,vec2 c,vec2 h,float soft){vec2 d=abs(p-c)-h;return smoothstep(soft,0.0,max(d.x,d.y));}

vec3 env(vec3 r){
  float lon=atan(r.x,-r.z);float lat=r.y;
  vec3 c=vec3(0.018,0.016,0.014)+vec3(0.2,0.17,0.13)*smoothstep(-0.3,0.8,lat)*(0.5+0.5*sin(lon*1.3+0.6));
  float k=0.0;
  k+=box(vec2(lon,lat),vec2(-0.9,0.55),vec2(0.45,0.22),0.12)*3.0;
  k+=box(vec2(lon,lat),vec2(1.15,0.25),vec2(0.08,0.55),0.06)*2.4;
  k+=box(vec2(lon,lat),vec2(2.6,0.1),vec2(0.25,0.35),0.15)*1.2;
  k+=smoothstep(0.035,0.0,abs(lat-0.08-0.05*sin(lon*2.0)))*0.9;
  k+=smoothstep(0.8,1.0,lat)*1.4;
  k+=box(vec2(lon,lat),vec2(0.2,-0.45),vec2(1.2,0.04),0.08)*1.3;
  k+=box(vec2(lon,lat),vec2(-2.0,-0.2),vec2(0.06,0.4),0.05)*1.6;
  // broad front fill behind the camera so the stroke faces read as polished gold, with a vertical falloff
  k+=box(vec2(abs(lon),lat),vec2(3.14,0.2),vec2(0.55,0.45),0.7)*(0.55+0.45*smoothstep(-0.4,0.6,lat));
  c+=vec3(1.0,0.97,0.92)*k;
  c+=vec3(0.9,0.62,0.3)*smoothstep(-0.25,-0.9,lat)*0.12;
  k=box(vec2(lon,lat),vec2(-0.4,-0.62),vec2(1.6,0.1),0.18)*1.1+box(vec2(lon,lat),vec2(1.9,-0.35),vec2(0.35,0.08),0.1)*1.4;
  c+=vec3(1.0,0.96,0.88)*k;
  return c;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 m=uMouse*vec2(uRes.x/uRes.y,1.0)*0.5;
  vec2 c=uLayout.xy;
  sc=uLayout.z*1.22;
  float t0=uTime;
  float yaw=uPose.x+sin(t0*0.31)*0.22+uScroll*0.9+uMouse.x*0.32*uHover;
  ry=rot(yaw);
  rx=rot(-0.1+sin(t0*0.23)*0.06-uMouse.y*0.18*uHover);
  float ns=uPose.z;
  nodeP=vec3(perim(ns),0.16)+vec3(0.0,sin(t0*1.1)*0.03,0.0);
  vec3 ro=vec3(uMouse*0.05,3.2);
  vec3 rd=normalize(vec3(uv-c,-1.65));

  vec3 col=vec3(0.0);float alpha=0.0;
  float dc=length(uv-c);
  float halo=exp(-dc*dc*7.0/(uLayout.z*uLayout.z+0.01))*0.42*(1.0-uScroll*0.5)*(1.0-uWire*0.7);
  col+=uGold*halo*0.3;alpha+=halo*0.3;
  vec2 g=uv*22.0+vec2(0.0,uTime*0.3);
  vec2 id=floor(g);vec2 f=fract(g)-0.5;
  float h=hash(id);
  float mote=smoothstep(0.08,0.0,length(f+vec2(sin(uTime+h*6.3),cos(uTime*0.8+h*4.1))*0.3))*step(0.95,h)*(0.5+0.5*sin(uTime*2.0+h*20.0));
  col+=uGold*mote*0.6;alpha+=mote*0.6;

  float rb=sc*(1.64+uPose.y*0.75);
  float bb=dot(ro,rd);float cc=dot(ro,ro)-rb*rb;float disc=bb*bb-cc;
  if(disc>0.0){
    float t=max(-bb-sqrt(disc),0.0);float tEnd=-bb+sqrt(disc);
    float hit=-1.0;
    for(int i=0;i<STEPS;i++){
      float d=map(ro+rd*t);
      if(d<0.001){hit=t;break;}
      t+=d;
      if(t>tEnd)break;
    }
    if(hit>0.0){
      vec3 p=ro+rd*hit;
      vec3 n=calcN(p);
      float ao=clamp(map(p+n*0.05*sc)/(0.045*sc),0.0,1.0);
      map(p);
      float mt=mat;
      vec3 v=-rd;
      vec3 r=reflect(rd,n);
      r.xz*=rot(uMouse.x*0.3);
      r.yz*=rot(-uMouse.y*0.15);
      float cosv=max(dot(n,v),0.0);
      float fres=pow(1.0-cosv,5.0);
      vec3 L=normalize(vec3(0.6,0.8,0.7));
      float sp=pow(max(dot(reflect(-L,n),v),0.0),90.0);
      vec3 c3;
      if(mt<1.5){
        vec3 F=uGold+(1.0-uGold)*fres;
        c3=env(r)*F+uGold*max(dot(n,L),0.0)*0.06+vec3(1.0,0.95,0.85)*sp*1.2;
      } else if(mt<2.5){
        float F=0.045+0.955*fres;
        c3=env(r)*F*vec3(0.95,0.93,0.9)+uGold*pow(1.0-cosv,3.0)*0.1+vec3(1.0)*sp*1.6;
      } else {
        c3=uGold*0.95+env(r)*uGold*0.4;
      }
      c3*=mix(0.45,1.0,ao);
      // click pulse: a gold ring sweeping across the sculpture from the click point
      float cr=uClick.z;
      if(cr<2.5){
        vec2 cp=uClick.xy*vec2(uRes.x/uRes.y,1.0)*0.5;
        float pr=abs(length(uv-cp)-cr*0.7);
        c3+=uGold*smoothstep(0.035,0.0,pr)*exp(-cr*1.8)*1.1;
      }
      c3=c3/(1.0+c3*0.45);
      if(uWire>0.001){
        vec3 q=p/sc;q.xz*=ry;q.yz*=rx;
        float lat=q.y*7.0+uTime*0.25;
        float lon=(q.x*0.8+q.z*1.4)*5.0;
        float l1=smoothstep(0.86,0.97,abs(fract(lat)-0.5)*2.0);
        float l2=smoothstep(0.9,0.98,abs(fract(lon)-0.5)*2.0);
        float lines=max(l1,l2*0.6);
        float rim=pow(1.0-cosv,2.0);
        vec3 wc=uGold*(lines*1.35+rim*0.8)+vec3(1.0,0.95,0.8)*pow(lines,6.0)*0.25;
        float wa=clamp(lines*0.9+rim*0.6,0.0,1.0);
        if(mt>2.5){wc=uGold*1.2;wa=1.0;}
        c3=mix(c3,wc,uWire);
        col=c3;alpha=mix(1.0,wa,uWire);
      } else { col=c3;alpha=1.0; }
    }
  }
  col+=(hash(gl_FragCoord.xy+fract(uTime))-0.5)/255.0;
  gl_FragColor=vec4(max(col,0.0),clamp(alpha,0.0,1.0))*uAlpha;
}
`;
