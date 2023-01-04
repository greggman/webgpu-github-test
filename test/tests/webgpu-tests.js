import {
  assertArrayEqual,
  assertTruthy,
  assertFalsy,
  assertEqual,
} from '../assert.js';
import {beforeEach, afterEach, describe, it} from '../mocha-support.js';

class MsgCapturer {
  constructor() {
    this.errors = [];
    this.cb = (msg) => this.errors.push(msg);
  }
  hasMsgs() {
    return this.errors.length > 0;
  }
}

describe('webgpu tests', () => {

  it('renders', async() => {
    assertTruthy(navigator.gpu, 'navigator.gpu exists');

    const adapter = await navigator.gpu.requestAdapter();
    assertTruthy(adapter, 'can get adapter');

    const device = await adapter.requestDevice();
    assertTruthy(device, 'can get device');

    const context = document.createElement('canvas').getContext('webgpu');
    context.canvas.width = 2;
    context.canvas.height = 2;
    assertTruthy(context, 'can get webgpu context');

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'opaque',
    });

    const module = device.createShaderModule({
        code: `
            @vertex fn vs(
              @builtin(vertex_index) VertexIndex : u32
            ) -> @builtin(position) vec4<f32> {
              var pos = array<vec2<f32>, 3>(
                vec2( 0.0, -2.0),
                vec2( 0.0,  2.0),
                vec2(-2.0, 2.0),
              );

              return vec4(pos[VertexIndex], 0.0, 1.0);
            }

            @fragment fn fs() -> @location(0) vec4<f32> {
              return vec4(1.0, 0.0, 0.0, 1.0);
            }
        `,
    });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module,
            entryPoint: 'vs',
        },
        fragment: {
            module,
            entryPoint: 'fs',
            targets: [{ format: presentationFormat }],
        },
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: [0.0, 1.0, 0.0, 1.0],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    });
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();

    device.queue.submit([encoder.finish()]);

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = 2;
    ctx.canvas.height = 2;
    ctx.drawImage(context.canvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, 2, 2);
    assertArrayEqual(imgData.data, new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255,
      255, 0, 0, 255, 0, 255, 0, 255,
    ]), 'colors match');

  });

});