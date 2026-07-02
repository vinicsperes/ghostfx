const [GR, GG, GB] = [5, 185, 32];
const [SR, SG, SB] = [14, 90, 74];
const [DR, DG, DB] = [10, 60, 20];

export const BG_VS = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.,1.);}`;

export const CLEAN_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(uv-0.5)*vec2(u_res.x/u_res.y,1.0);
  float ang=atan(p.y,p.x);
  float wob=sin(ang*5.0+u_t*.55)*0.013+sin(ang*9.0-u_t*.40)*0.008;
  float r=length(p)+wob;
  float s=cos(r*44.0-u_t*1.60);
  float pulse=0.82+0.18*sin(u_t*0.90);
  float c=smoothstep(-0.30,1.0,s)*pulse;
  float thresh=mix(1.0,0.30,u_blend);
  float alt=sin(r*22.0-u_t*0.80)*.5+.5;
  vec4 col;
  if(c>thresh){
    float b=pow((c-0.30)/0.70,0.5);
    vec3 violet=vec3(118.,30.,205.)/255.;
    vec3 abyss=vec3(186.,34.,150.)/255.;
    col=vec4(mix(violet,abyss,alt*.6)*b, b*0.90);
  } else {
    float d=(s*0.5+0.5)*(0.14+0.10*alt);
    col=vec4(d*(14.+alt*20.)/255., d*3./255., d*(26.+alt*16.)/255., 1.0);
  }
  gl_FragColor=col;
}`;

export const FROST_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(uv-0.5)*vec2(u_res.x/u_res.y,1.0);
  float w=sin(p.x*2.2+u_t*.10)*.45+sin(p.y*1.8-u_t*.08)*.45;
  float v=sin((p.x*3.0+w)*2.2+u_t*.06)
         +sin((p.y*3.4-w)*1.9-u_t*.05)
         +sin((p.x*2.2+p.y*2.6+w)*2.0+u_t*.045);
  float ridge=abs(fract(v*1.15)-.5)*2.0;
  float c=1.0-ridge;
  float thresh=mix(1.0,0.55,u_blend);
  vec4 col;
  if(c>thresh){
    float b=pow((c-.55)/.45,.6);
    float shimmer=sin(v*1.3+u_t*.12)*.5+.5;
    col=vec4(b*(150.+shimmer*70.)/255., b*(186.+shimmer*54.)/255., b*(222.+shimmer*30.)/255., b*.62);
  } else {
    float d=(sin(v*.6)+1.)*.5;
    col=vec4((6.+d*10.)/255., (10.+d*14.)/255., (20.+d*22.)/255., 1.);
  }
  gl_FragColor=col;
}`;

export const HEAVY_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
float tri(float x){return abs(fract(x)-.5)*2.;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float cx=uv.x-.5,cy=.5-uv.y;
  float w1=sin(cx*1.6+cy*1.1+u_t*.11)*.62;
  float w2=sin(cy*1.9-cx*1.3-u_t*.09)*.52;
  float v=tri((cx+cy+w1)*5.5+u_t*.23)*2.5
         +tri((cx-cy+w2)*5.0-u_t*.19)*2.2
         +tri((cx+cy*.5+w1*.5)*3.6+u_t*.14)*1.3;
  float c=abs(cos(v*3.1));
  float b=pow(max(0.,(c-.18)/.82),.50);
  float w=sin(v*.5+u_t*.04)*.15+.85;
  float r=b*w;
  float thresh=mix(1.0,0.04,u_blend);
  vec4 col;
  if(b>thresh){col=vec4(r*228./255.,r*14./255.,r*18./255.,r*.92);}
  else{col=vec4(0.,0.,0.,1.);}
  gl_FragColor=col;
}`;

export const HAZE_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float nx=uv.x,ny=1.-uv.y,cx=nx-.5,cy=ny-.5;
  float r=sqrt(cx*cx+cy*cy);
  float v=sin(nx*8.+u_t*.50)*1.1
         +sin(ny*6.-u_t*.40)*1.1
         +sin(r*16.-u_t*1.20)*1.5
         +sin((cx*9.-cy*7.)+u_t*.30)*.9
         +sin((cx*5.+cy*11.)-u_t*.22)*.7;
  float c1=abs(cos(v*3.14159265));
  float c2=abs(cos(v*3.14159265*.5+.9));
  float t1=mix(1.0,0.78,u_blend);
  float t2=mix(1.0,0.85,u_blend);
  vec4 col;
  if(c1>t1){
    float b=pow((c1-.78)/.22,.55);
    float violet=sin(v*1.4+u_t*.15)*.5+.5;
    col=vec4(b*(212.-violet*58.)/255.,b*(106.-violet*14.)/255.,b*(159.+violet*49.)/255.,b*248./255.);
  } else if(c2>t2){
    float b=pow((c2-.85)/.15,.5)*.42;
    col=vec4(b*130./255.,b*70./255.,b*180./255.,b*160./255.);
  } else {
    float depth=(sin(v*.4)+1.)*.5;
    col=vec4(depth*24./255.,depth*6./255.,depth*28./255.,1.);
  }
  gl_FragColor=col;
}`;

export const GHOST_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=vec2(uv.x,1.-uv.y);
  vec2 q=vec2(sin(p.x*3.2+u_t*.13)+sin(p.y*2.6+u_t*.10),
              sin(p.x*2.9-u_t*.11)+sin(p.y*3.4-u_t*.09));
  vec2 r=vec2(sin(p.x*3.+q.x*2.2+u_t*.09)+sin(p.y*2.2-q.y*1.8-u_t*.07),
              sin(p.x*2.2-q.y*2.1-u_t*.08)+sin(p.y*3.1+q.x*1.9+u_t*.10));
  float v=length(r);
  float c=abs(cos(v*4.2));
  float c2=abs(cos(v*4.2+1.57));
  float thresh=mix(1.0,0.76,u_blend);
  float t2=mix(1.0,0.93,u_blend);
  vec4 col;
  if(c>thresh){float b=pow((c-.76)/.24,.55);col=vec4(b*${GR}./255.,b*${GG}./255.,b*${GB}./255.,b*.82);}
  else if(c2>t2){float b2=pow((c2-.93)/.07,.8)*.30;col=vec4(b2*${SR}./255.,b2*${SG}./255.,b2*${SB}./255.,b2);}
  else{float d=(cos(v*1.8)+1.)*.12;col=vec4(d*${DR}./2550.,d*${DG}./2550.,d*${DB}./2550.,1.);}
  gl_FragColor=col;
}`;

export const FEVER_FS = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(uv-0.5)*vec2(u_res.x/u_res.y,1.0);
  vec2 q=abs(p);
  vec2 w=vec2(sin(q.y*4.0+u_t*.35)+sin(q.x*6.3-u_t*.28),
              sin(q.x*5.1-u_t*.30)+sin(q.y*3.7+u_t*.40));
  vec2 g=q+0.13*w;
  float curl=sin(g.y*14.0+w.x*1.6-u_t*.9)*2.2;
  float strands=abs(sin(g.x*80.0+curl));
  float phase=sin(g.y*14.0+sin(g.x*9.0)*1.8-u_t*2.2);
  float breaks=smoothstep(-.75,.15,phase);
  float c=strands*breaks;
  float thresh=mix(1.0,0.45,u_blend);
  vec4 col;
#ifdef GL_OES_standard_derivatives
  float aa=fwidth(c)*1.5;
#else
  float aa=.02;
#endif
  if(c>thresh-aa){
    float edge=smoothstep(thresh-aa,thresh+aa+.05,c);
    float hueMix=.5+.5*sin(g.x*6.0+g.y*3.5+w.y*.8-u_t*.6);
    float grad=smoothstep(-.6,1.0,phase);
    vec3 roxo=vec3(122.,38.,215.)/255.;
    vec3 magenta=vec3(240.,42.,150.)/255.;
    vec3 tint=mix(roxo,magenta,hueMix)*(0.74+0.34*grad);
    float d=(sin(g.x*3.0+g.y*2.0)+1.)*.5;
    vec3 bg=vec3((9.+d*7.)/255., (4.+d*3.)/255., (24.+d*12.)/255.);
    col=vec4(mix(bg,tint,edge),1.0);
  } else {
    float d=(sin(g.x*3.0+g.y*2.0)+1.)*.5;
    col=vec4((9.+d*7.)/255., (4.+d*3.)/255., (24.+d*12.)/255., 1.0);
  }
  gl_FragColor=col;
}`;

export const PRESET_FS = [GHOST_FS, CLEAN_FS, FROST_FS, HEAVY_FS, HAZE_FS, FEVER_FS];
export const PRESET_OPACITY = [0.7, 0.65, 0.74, 0.82, 0.88, 0.82];

export type GlState = {
  tLoc: WebGLUniformLocation;
  rLoc: WebGLUniformLocation;
  blendLoc: WebGLUniformLocation;
  prog: WebGLProgram;
};

export const BLEND_OUT = 550;
export const BLEND_IN = 750;

export const INTRO_IDX = 3;

export function buildShader(gl: WebGLRenderingContext, idx: number, old?: WebGLProgram): GlState {
  if (old) gl.deleteProgram(old);
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, BG_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PRESET_FS[idx]));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const pos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  return {
    tLoc: gl.getUniformLocation(prog, "u_t")!,
    rLoc: gl.getUniformLocation(prog, "u_res")!,
    blendLoc: gl.getUniformLocation(prog, "u_blend")!,
    prog,
  };
}
