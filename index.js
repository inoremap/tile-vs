"use strict";

let gl = null;
let tilemap_tex = -1;
let vertex_buffer = null;

const tile_size = 8;

const tileset_w = 8; // in tiles
const tileset_h = 8;

const tilemap_w = 16; // in tiles
const tilemap_h = 16;

const scale = 4;

function error(msg) {
    throw new Error(msg);
}

const vertices_per_tile = 6; // 2 triangles
const values_per_vertex = 2; // geometry x and y
const values_per_tile = vertices_per_tile * values_per_vertex;

let geom = new Int16Array(0);
let geom_pos;

function geom_prepare(count) {
    geom_pos = 0;
    const req_length = count * values_per_tile;
    if (req_length > geom.length)
        geom = new Int16Array(req_length);
}

function geom_vertex2(v0, v1) {
    geom[geom_pos] = v0;
    geom_pos++;
    geom[geom_pos] = v1;
    geom_pos++;
}

/* 1--2    4
   | /   / |
   0    3--5 */
function geom_rect(x, y, w, h) {
    if ((geom_pos + values_per_tile) > geom.length)
        return false;
    geom_vertex2(x + 0, y + h);
    geom_vertex2(x + 0, y + 0);
    geom_vertex2(x + w, y + 0);
    geom_vertex2(x + 0, y + h);
    geom_vertex2(x + w, y + 0);
    geom_vertex2(x + w, y + h);
    return true;
}

const tilemap_src = [
    0,0,0,0,0,0,0,0,0,10,5,6,5,6,5,6,
    0,0,0,0,0,0,0,0,0,10,13,14,13,14,13,14,
    0,33,0,34,0,0,0,0,0,10,5,6,5,6,5,6,
    3,4,3,4,0,0,0,0,0,10,13,14,13,14,13,14,
    9,9,9,2,0,0,0,0,0,10,11,12,11,12,11,12,
    9,9,9,2,0,0,0,0,0,0,0,0,0,0,0,0,
    9,9,9,2,0,49,50,0,0,0,0,0,0,51,52,0,
    9,9,9,2,0,57,58,0,0,0,0,0,0,59,60,0,
    17,18,19,20,17,18,19,20,0,0,0,0,17,18,19,20,
    25,26,27,28,25,26,27,28,0,0,0,0,25,26,27,28,
    21,22,21,22,21,22,21,22,0,0,0,0,23,24,23,24,
    29,30,29,30,29,30,29,30,0,0,0,0,31,32,31,32,
    21,22,21,22,21,22,21,22,0,0,0,0,23,24,23,24,
    29,30,29,30,29,30,29,30,0,0,0,0,31,32,31,32,
    21,22,21,22,21,22,21,22,0,0,0,0,23,24,23,24,
    29,30,29,30,29,30,29,30,0,0,0,0,31,32,31,32
];

function init(tileset_img) {
    //console.log(`tileset_img.width=${tileset_img.width}`);
    //console.log(`tileset_img.height=${tileset_img.height}`);

    const display = document.getElementById('display');
    gl = display.getContext('webgl') ?? error('no webgl context');

    const half_w = (display.width / 2.0).toFixed(20);
    const half_h = (display.height / 2.0).toFixed(20);
    const inv_w = (2.0 / display.width).toFixed(20);
    const inv_h = (-2.0 / display.height).toFixed(20);

    const inv_tilemap_w = (1.0 / tilemap_w).toFixed(20);
    const inv_tilemap_h = (1.0 / tilemap_h).toFixed(20);

    const inv_tw = (tile_size / tileset_img.width).toFixed(20);
    const inv_th = (tile_size / tileset_img.height).toFixed(20);

    const scale_s = (scale * tile_size).toFixed(1);

    const inv_tile_count_w = (tile_size / tileset_img.width).toFixed(20);
    const inv_tile_count_h = (tile_size / tileset_img.height).toFixed(20);

    const vert_src = `
attribute vec2 a_geom;
uniform sampler2D u_tilemap;
varying highp vec2 v_tex;

void main(void) {
    vec2 tile = floor(a_geom * 0.5);
    vec2 geom = fract(a_geom * 0.5) * 2.0;
    vec2 pos = ((a_geom - tile) * ${scale_s} - vec2(${half_w}, ${half_h})) * vec2(${inv_w}, ${inv_h});
    gl_Position = vec4(pos, 0.0, 1.0);

    vec2 tex = texture2D(u_tilemap, tile * vec2(${inv_tilemap_w}, ${inv_tilemap_h})).ra * 255.0;
    v_tex = (geom + tex) * vec2(${inv_tile_count_w}, ${inv_tile_count_h});
}
`;
    const vert_shader = gl.createShader(gl.VERTEX_SHADER) ?? error('vertex shader create fail');
    gl.shaderSource(vert_shader, vert_src);
    gl.compileShader(vert_shader);
    if (!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
        alert('VERTEX: ' + gl.getShaderInfoLog(vert_shader));
        return false;
    }

    const frag_src = `
varying highp vec2 v_tex;
uniform sampler2D u_tileset;

void main(void) {
    gl_FragColor = texture2D(u_tileset, v_tex);
}
`;
    const frag_shader = gl.createShader(gl.FRAGMENT_SHADER) ?? error('fragment shader create fail');
    gl.shaderSource(frag_shader, frag_src);
    gl.compileShader(frag_shader);
    if (!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
        alert('FRAGMENT: ' + gl.getShaderInfoLog(frag_shader));
        return false;
    }
    const shader_program = gl.createProgram() ?? error('shader program create fail');
    gl.attachShader(shader_program, vert_shader);
    gl.attachShader(shader_program, frag_shader);
    gl.linkProgram(shader_program);
    if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
        alert(gl.getProgramInfoLog(shader_program));
        return false;
    }
    gl.useProgram(shader_program);

    vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    const a_geom = gl.getAttribLocation(shader_program, 'a_geom');
    if (a_geom >= 0) {
        gl.vertexAttribPointer(a_geom, 2, gl.SHORT, false, 0, 0);
        gl.enableVertexAttribArray(a_geom);
    } else {
        console.log('a_geom not found');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const u_tileset = gl.getUniformLocation(shader_program, 'u_tileset');
    if (u_tileset) {
        const tileset = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tileset);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tileset_img);

        gl.uniform1i(u_tileset, 0);
    } else {
        console.log('u_tileset not found');
    }

    let tilemap_data = new Uint8Array(tilemap_w * tilemap_h * 2);
    for (let y = 0; y < tilemap_h; y++)
        for (let x = 0; x < tilemap_w; x++) {
            const src = x + y * tilemap_w;
            const dst = src * 2;
            let tile = tilemap_src[src];
            if (tile > 0)
                tile = tile - 1;
            let tx = tile % tileset_w;
            let ty = Math.floor(tile / tileset_w);
            tilemap_data[dst] = tx;
            tilemap_data[dst + 1] = ty;
        }

    const u_tilemap = gl.getUniformLocation(shader_program, 'u_tilemap');
    if (u_tilemap) {
        tilemap_tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tilemap_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA,
                tilemap_w, tilemap_h, 0,
                gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, tilemap_data);

        gl.uniform1i(u_tilemap, 1);
    } else {
        console.log('u_tilemap not found');
    }

    geom_prepare(visible_tilemap_w * visible_tilemap_h);
    for (let y = 0; y < visible_tilemap_h; y++)
        for (let x = 0; x < visible_tilemap_w; x++) {
            geom_rect(x * 2, y * 2, 1, 1);
        }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, geom, gl.STREAM_DRAW);

    gl.clearColor(0.2, 0.4, 0.6, 1.0);
    gl.viewport(0, 0, display.width, display.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //gl.enable(gl.DEPTH_TEST);
    return true;
}

let tilemap_data_mod = new Uint8Array([2, 4]); // red flower

function display_on_mousedown(ev) {
    if (gl == null)
        return;

    const x = Math.floor(ev.offsetX / (tile_size * scale));
    const y = Math.floor(ev.offsetY / (tile_size * scale));
    //console.log(`display_on_mousedown ${x} ${y}`);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tilemap_tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1, 1, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, tilemap_data_mod);
    window.requestAnimationFrame(draw);
}

function tileset_on_mousedown(ev) {
    const x = Math.floor(ev.offsetX / (tile_size * scale));
    const y = Math.floor(ev.offsetY / (tile_size * scale));
    //console.log(`tileset_on_mousedown ${x} ${y}`);

    tilemap_data_mod[0] = x;
    tilemap_data_mod[1] = y;
}

const visible_tilemap_w = 16;
const visible_tilemap_h = 16;

function draw(_timestamp) {
    if (gl == null)
        return;
    //window.requestAnimationFrame(draw);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, geom_pos / values_per_vertex);
    //gl.flush();
}

const tileset_data = `iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IB2cksfwAAAARnQU1BAACx
jwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAABClJREFU
eNrtW7+P1EYU/sa69LnyEBRxkS5IiDZpkBB/wZuSRKIMRXoKBNL1FKQkiijndUkVIZ2EoEVIXHeF
KXI6mkhHT/Eo/GPH4/HY3tm9nXX8pJX3/ObZ833v14zXpzAgIiS9SgZAWF82YK80q4grIIu5OXPc
5HdqX8nBJG/Zf3JYP3i5TdtvnYArkDGgiDZ7z6QIGAWQpkfLdmrATORgbP4Hw5M3l5NXLdn/GTwA
HPj7vAGgS3x6e5WYOW4ZsNMawAxwRDWKtb/yLuB625381GhIAXxFgOlR1ef13LuA7uT9TtcAlGgK
XN1yMEEChgpWdEHbYSt1aoDxgNOzBQ8Aygha6wDNgAnkYUi/ji1x+4TW4f2Aq3PJ08ygQCFx7bP2
zSkIACgBaN0dFGM7tpUObZTWsc9sAPax14uecTG2nZUhxWRT2Pu9K0HNAIjLT2CCzflqrOY42yQ2
Q52J1BPU1AVQA2UPSKZxtk5NSHo3WE+w8bJNkk1CDd7St2z3bjusV4B7ARCX4zQ6nu14uB47YiUY
0xIJNLklZ52J6ZFbAN3zPTRWB66xpSo/ZJ+VtJMVyrS6kh4AtM5Y914TQIx6aBroAr7oyFp57PYj
Ir/XyJn8mLH27Jk26sUY+2ywGbteG2zGPR6OTfAt1Yhs9EqkBtY3C9u2j6gNkLC9LlBPbGiCvnEx
tik8Eiu7GK0KRV8kVBNvCg2vgmsdW6YECHBbeD1BdoHw8Dp7qi1N/HV4G3uFLASmJocYkzYZMba7
2BE2IkISeh+AyAiR6dULkQgF3idIUFY/jHiYMwJhbXqpNQIhbYW9R68VVNIEtELHyjH3SZExJUta
+/VUPQ3hagPg6pPdDCnFquV9KlNBNx1Lq5b3iUBkGr1iVrb3iQhCK/vkCahBkwkUCCJopsb7XTWV
bU3v36+kmR2qSrNSGlCqfPFIq/ZDUwYrBpdR4dFrQKkqKmr9XrBgBAIDacA4lTxWv1ckwEB8AGL1
iyyyyCKLLLLIIqnJ0FJVJo6fFQFydnzUOvH9o0+zJKEPvJwdH4ktZ8dH4omK+RIgInL/76fNcY7g
+8JZRLpYlVKzS4G+p8KqAjsZfJ7nMosI+PWyi+P3wzAJeZ7L+wd3cevFq9b5oihUnudiH1MmwAt+
iAQb/OM7P7R0T05OUevqYyokqFD+P/zcVjz/1p8KPvCH168BAC7PLwAA/378hBvfHbVISYGEjf7P
kA3+8vyiA/7OLz8CQHNMuQiW8pfzGSk1cFdO/nzbHN8/uJtEwcz6OsDDl1XO/6wGO0FRFOrWi1dN
2A/J4fVreP0ljX9Y29jr8kVRqN9e/iPP7t/D5fkFnpycNmlx86fb+PDmHf74+F81+rSxSbYNfvlQ
fvnmJmB/H9MGATSV3ndub5bD1tJ39DI4z3Nxc9t3bpFE5CuQVGrJQG5JKwAAAABJRU5ErkJggg==`;

async function main() {
    const display = document.getElementById('display');
    let tileset_pal = document.getElementById('tileset_pal');

    let tileset_img = new Image();
    tileset_img.src = 'data:image/png;base64,' + tileset_data;
    tileset_pal.src = tileset_img.src;
    await tileset_img.decode();
    const init_ok = init(tileset_img);
    tileset_img.src = '';
    tileset_img = null;

    if (!init_ok)
        return;

    display.addEventListener('mousedown', display_on_mousedown);
    tileset_pal.addEventListener('mousedown', tileset_on_mousedown);

    window.requestAnimationFrame(draw);
}
