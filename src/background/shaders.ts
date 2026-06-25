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
  vec4 col;
  if(c>thresh){
    float b=pow((c-0.30)/0.70,0.5);
    col=vec4(b*160./255., b*58./255., b*236./255., b*0.88);
  } else {
    float d=(s*0.5+0.5)*0.14;
    col=vec4(d*16./255., d*5./255., d*30./255., 1.0);
  }
  gl_FragColor=col;
}`;

export const STATIC_FS = `
precision mediump float;
uniform float u_t; uniform vec2 u_res; uniform float u_blend;
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=vec2(uv.x,1.-uv.y);
  vec2 q=vec2(sin(p.x*2.6+u_t*.07)+sin(p.y*2.2-u_t*.05),
              sin(p.x*2.3-u_t*.06)+sin(p.y*2.9+u_t*.045));
  vec2 r=vec2(sin(p.x*2.4+q.x*1.8+u_t*.05)+sin(p.y*2.0-q.y*1.6-u_t*.04),
              sin(p.x*1.9-q.y*1.7-u_t*.05)+sin(p.y*2.7+q.x*1.5+u_t*.06));
  float v=length(r)*.55;
  float c=abs(cos(v*2.7));
  float thresh=mix(1.0,0.52,u_blend);
  vec4 col;
  if(c>thresh){
    float b=pow((c-.52)/.48,.7);
    col=vec4(b*198./255., b*205./255., b*216./255., b*.5);
  } else {
    float d=(cos(v*1.5)+1.)*.5;
    col=vec4(d*15./255., d*15./255., d*19./255., 1.);
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

export const FRUS_FS = `
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
    float purple=sin(v*1.4+u_t*.15)*.5+.5;
    col=vec4(b*(35.+purple*90.)/255.,b*(155.+purple*25.)/255.,b,b*248./255.);
  } else if(c2>t2){
    float b=pow((c2-.85)/.15,.5)*.42;
    col=vec4(b*45./255.,b*110./255.,b*200./255.,b*160./255.);
  } else {
    float depth=(sin(v*.4)+1.)*.5;
    col=vec4(depth*4./255.,depth*9./255.,depth*28./255.,1.);
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
  float thresh=mix(1.0,0.76,u_blend);
  vec4 col;
  if(c>thresh){float b=pow((c-.76)/.24,.55);col=vec4(b*5./255.,b*185./255.,b*32./255.,b*.82);}
  else{float d=(cos(v*1.8)+1.)*.12;col=vec4(d*1./255.,d*6./255.,d*2./255.,1.);}
  gl_FragColor=col;
}`;

export const PRESET_FS = [CLEAN_FS, STATIC_FS, HEAVY_FS, FRUS_FS, GHOST_FS];
export const PRESET_OPACITY = [0.65, 0.74, 0.82, 0.88, 0.70];

export type GlState = { tLoc: WebGLUniformLocation; rLoc: WebGLUniformLocation; blendLoc: WebGLUniformLocation; prog: WebGLProgram };

export const BLEND_OUT = 550;
export const BLEND_IN  = 750;

export const INTRO_IDX = 2;

export function buildShader(gl: WebGLRenderingContext, idx: number, old?: WebGLProgram): GlState {
  if (old) gl.deleteProgram(old);
  const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, BG_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PRESET_FS[idx]));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  return { tLoc: gl.getUniformLocation(prog, "u_t")!, rLoc: gl.getUniformLocation(prog, "u_res")!, blendLoc: gl.getUniformLocation(prog, "u_blend")!, prog };
}
