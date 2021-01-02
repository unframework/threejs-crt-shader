// by nick.matantsev@gmail.com, code licensed under MIT
import React, { useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFrame, MeshStandardMaterialProps } from 'react-three-fiber';
import * as THREE from 'three';

const fragmentParsChunk = `
  uniform vec2 textureSize;
  uniform vec2 consoleSize; // includes padding
  uniform vec2 consolePaddingSize;

  uniform vec3 bgColor;
  uniform vec3 fgColor;

  uniform float glitchLine;
  uniform float glitchFlutter;
  uniform float glitchAmount;
  uniform float glitchDistance;

  uniform vec3 crtPlaneOrigin;
  uniform vec3 crtPlaneNormal;
  uniform vec3 crtPlaneTangent;
  uniform vec3 crtPlaneBitangent;

  uniform mat4 modelViewMatrix; // not exposed to frag shader normally

  #define edgeFadeTexelWidth 3.0
  #define crtSphereRadius 3.0
  #define scanlineSuppressionStart 0.15
`;

const fragmentChunk = `
  // when pixels are far away, hide scan-line moire (smoothstep-ing the square is enough)
  vec2 vTexelStrideVec = vec2(dFdx(vUv.y), dFdy(vUv.y)) * consoleSize.y;
  float scanlineSuppression = smoothstep(scanlineSuppressionStart, scanlineSuppressionStart * 2.0, dot(vTexelStrideVec, vTexelStrideVec));

  // @todo perform plane transform per-vertex for performance?
  // get plane parameters in view-space
  mat4 crtTBNP = modelViewMatrix * mat4(
    vec4(crtPlaneTangent, 0.0),
    vec4(crtPlaneBitangent, 0.0),
    vec4(crtPlaneNormal, 0.0),
    vec4(crtPlaneOrigin, 1.0)
  );
  mat4 crtTBNPInv = inverse(crtTBNP);

  // convert view-ray into tangent-space
  vec3 crtViewRayTBN = -normalize(crtTBNPInv * vec4(vViewPosition, 0.0)).xyz;
  vec3 crtViewOriginTBN = crtTBNPInv[3].xyz; // same as crtTBNPInv * vec4(0.0, 0.0, 0.0, 1.0)

  // find intersection point with "sphere" in tangent-space
  // (actually in view-space this "sphere" is distorted with CRT aspect ratio, which is exactly what we want)
  // (as per https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection)
  vec2 crtUV = vec2(0.0, 0.0);

  vec3 crtSphereCenter = vec3(0.5, 0.5, -crtSphereRadius);
  vec3 crtPosToSphere = crtSphereCenter - crtViewOriginTBN;
  float crtSphereCenterDist = dot(crtViewRayTBN, crtPosToSphere);
  float crtDiscriminant2 = dot(crtPosToSphere, crtPosToSphere) - crtSphereCenterDist * crtSphereCenterDist;

  float crtSphereRadius2 = crtSphereRadius * crtSphereRadius;
  if (crtDiscriminant2 < crtSphereRadius2) {
    float crtTHC = sqrt(crtSphereRadius2 - crtDiscriminant2);
    float crtRayDist = crtSphereCenterDist - crtTHC; // closer point of the two
    vec3 crtRaySpherePos = (crtViewOriginTBN + crtViewRayTBN * crtRayDist);
    crtUV = crtRaySpherePos.xy;
  }

  // distance "inwards"
  vec2 fromEdge = vec2(0.5, 0.5) - abs(crtUV - vec2(0.5, 0.5));

  if (fromEdge.x > 0.0 && fromEdge.y > 0.0) {
    vec2 texelPosition = vec2(crtUV.x, 1.0 - crtUV.y) * consoleSize - consolePaddingSize;
    vec2 inTexelOffset = mod(texelPosition, vec2(1.0)) - 0.5;

    // remove vertical texel interpolation if up close (otherwise keep smooth when zoomed out)
    texelPosition.y -= (1.0 - scanlineSuppression) * inTexelOffset.y;

    // compute glitch band amount for scan-line
    float distToGlitch = glitchLine - (texelPosition.y / consoleSize.y);
    float glitchOffsetLinear = smoothstep(0.0, 0.02, distToGlitch) * max(0.0, glitchDistance - distToGlitch) / glitchDistance;
    float glitchOffset = glitchOffsetLinear * glitchOffsetLinear;

    // distort horizontal UV for glitch band
    texelPosition.x -= (glitchOffset * glitchAmount + 0.005 * (glitchFlutter * glitchFlutter * glitchFlutter)) * consoleSize.x;

    // mask out texels that are inside padding (lerp starts at content edge texel midpoint)
    vec2 contentSize = consoleSize - consolePaddingSize * 2.0;
    vec2 inPaddingOffset = max(vec2(0.0), vec2(0.5) - texelPosition) + max(vec2(0.0), texelPosition - contentSize + vec2(0.5));
    float inPaddingMask = max(0.0, 1.0 - (inPaddingOffset.x + inPaddingOffset.y));

    // read from texture, clamping to content edge texel midpoints (padding mask takes care of lerping to zero outside of that)
    vec2 safeTexelPosition = clamp(texelPosition, vec2(0.5), contentSize - vec2(0.5));
    vec4 sourcePixel = inPaddingMask * texture2D(emissiveMap, safeTexelPosition / textureSize);
    vec3 sourceRGB = sourcePixel.rgb * sourcePixel.a; // multiply by source alpha just in case

    // compute simulated RMS biasing circuit effect, i.e. signal amp that adjusts dynamically:
    // signal over-amped due to recent lows means that signal black is noising up into gray
    // signal under-amped due to recent highs means that signal black is below true black
    // (actual ranges are tuned based just on looks alone, not much theoretical backing here)
    // @todo compute this in a pre-processing step
    float prevAvgIntensity = 0.0;
    for (int i = 1; i < 5; i += 1) {
      // averaged previous texels (with simple linear falloff, not bothering with actual root-mean-square)
      // (multiply by source alpha as well)
      vec2 prevTexelPosition = texelPosition + 1.5 * vec2(-i, 0.0);
      vec4 prevPixel = prevTexelPosition.x >= 0.0
        ? texture2D(emissiveMap, prevTexelPosition / textureSize)
        : vec4(0.0, 0.0, 0.0, 1.0);
      prevAvgIntensity += dot(prevPixel.rgb * prevPixel.a, vec3(0.3333, 0.3333, 0.3333)) * 0.1 * (5.0 - float(i));
    }

    float rmsLow = mix(-0.02, 0.2, prevAvgIntensity);
    float rmsHigh = mix(0.5, 1.5, prevAvgIntensity);

    vec3 pixelRGB = clamp((sourceRGB - rmsLow) / (rmsHigh - rmsLow), 0.0, 1.0);

    // screen-wide vignette effect
    vec2 screenCenter = crtUV - vec2(0.5); // coords relative to screen center (-0.5..0.5)
    float screenFade = 1.0 - dot(screenCenter, screenCenter) * 1.3;

    // simple linear fade on edges
    vec2 fromEdgeTexelDist = min(consoleSize * fromEdge / edgeFadeTexelWidth, vec2(1.0, 1.0));
    float edgeFade = fromEdgeTexelDist.x * fromEdgeTexelDist.y;

    // over-amp intensity at middle of scan-line to compensate for darker edges
    float scanlineTexelFade = mix(1.0 - inTexelOffset.y * inTexelOffset.y * 4.0, 1.0, scanlineSuppression);

    totalEmissiveRadiance *= edgeFade * screenFade * mix(
      bgColor,
      fgColor,
      scanlineTexelFade * pixelRGB + glitchOffset * 0.5
    );
  } else {
    totalEmissiveRadiance *= vec3(0.0, 0.0, 0.0);
  }
`;

export const CRTMaterial: React.FC<
  {
    canvasContext: CanvasRenderingContext2D;
    crtBgColor: THREE.Color;
    crtFgColor: THREE.Color;
    crtPlaneOrigin: THREE.Vector3 | number[];
    crtPlaneNormal: THREE.Vector3 | number[];
    crtPlaneTangent: THREE.Vector3 | number[];
    crtPlaneBitangent: THREE.Vector3 | number[];
  } & Exclude<
    MeshStandardMaterialProps,
    'emissive' | 'emissiveMap' | 'onBeforeCompile'
  >
> = ({
  canvasContext,
  crtFgColor,
  crtBgColor,
  crtPlaneOrigin,
  crtPlaneNormal,
  crtPlaneTangent,
  crtPlaneBitangent,
  ...standardParams
}) => {
  const crtShaderRef = useRef<THREE.Shader>();

  const currentTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  // wrapper around source canvas just for use to trigger pixel copy later
  // (this is never uploaded to GPU directly)
  const canvasTexture = useMemo(() => {
    // @todo fix deps
    return new THREE.Texture(canvasContext.canvas);
  }, []);

  // basic sizing
  const [textureSize, consoleSize, consolePaddingSize] = useMemo(() => {
    const padding = new THREE.Vector2(5, 5); // @todo get from props

    const textureW = 512; // @todo pick smallest possible
    const textureH = 256;
    const consoleW = canvasContext.canvas.width + padding.x * 2;
    const consoleH = canvasContext.canvas.height + padding.y * 2;

    if (consoleW > textureW || consoleH > textureH) {
      throw new Error(
        `input canvas is too large: ${consoleW}x${consoleH} (includes padding) does not fit into ${textureW}x${textureH}`
      );
    }

    return [
      new THREE.Vector2(textureW, textureH),
      new THREE.Vector2(consoleW, consoleH),
      padding,
    ];
  }, []);

  // @todo clean up when done
  const displayTexture = useMemo(() => {
    // target texture (we fill it per-frame via "manual" copy later, no need to keep data array reference)
    const texture = new THREE.DataTexture(
      new Uint8Array(textureSize.x * textureSize.y * 4),
      textureSize.x,
      textureSize.y,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.magFilter = THREE.LinearFilter; // shader relies on some texel blur (this is default but explicitly setting anyway)
    texture.minFilter = THREE.LinearFilter; // no mipmapping for performance
    texture.generateMipmaps = false; // no mipmapping for performance
    texture.flipY = false; // shader expects 0,0 to be top-left

    return texture;
  }, []);

  useFrame(({ gl }) => {
    // measure time
    if (currentTimeRef.current === 0) {
      currentTimeRef.current = performance.now();
    }

    const newTime = performance.now();
    const delta = Math.min(0.05, (newTime - currentTimeRef.current) / 1000); // apply limiter to avoid frame skips
    currentTimeRef.current = newTime;
    const elapsedTime = (elapsedTimeRef.current += delta);

    // glitch settings
    const glitchLine = (0.8 + elapsedTime * 0.07) % 1.0;
    const glitchFlutter = (elapsedTime * 40.0) % 1.0; // timed to be slightly out of sync from main frame rate
    const glitchAmount = 0.06 + glitchFlutter * 0.01;
    const glitchDistance = 0.04 + glitchFlutter * 0.15;

    if (displayTexture) {
      // perform "manual" copy from source canvas (default implementation would rescale to power-of-two)
      gl.copyTextureToTexture(
        new THREE.Vector2(0, 0),
        canvasTexture,
        displayTexture
      );
    }

    const crtShader = crtShaderRef.current;
    if (crtShader) {
      crtShader.uniforms.bgColor.value = crtBgColor;
      crtShader.uniforms.fgColor.value = crtFgColor;
      crtShader.uniforms.crtPlaneOrigin.value = crtPlaneOrigin;
      crtShader.uniforms.crtPlaneNormal.value = crtPlaneNormal;
      crtShader.uniforms.crtPlaneTangent.value = crtPlaneTangent;
      crtShader.uniforms.crtPlaneBitangent.value = crtPlaneBitangent;

      crtShader.uniforms.glitchLine.value = glitchLine;
      crtShader.uniforms.glitchFlutter.value = glitchFlutter;
      crtShader.uniforms.glitchAmount.value = glitchAmount;
      crtShader.uniforms.glitchDistance.value = glitchDistance;
    }
  });

  // @todo also handle material.customProgramCacheKey
  // (used only once, no need to memoize this)
  const materialHandler = (shader: THREE.Shader) => {
    shader.uniforms.textureSize = new THREE.Uniform(textureSize);
    shader.uniforms.consoleSize = new THREE.Uniform(consoleSize);
    shader.uniforms.consolePaddingSize = new THREE.Uniform(consolePaddingSize);

    shader.uniforms.glitchLine = new THREE.Uniform(0);
    shader.uniforms.glitchFlutter = new THREE.Uniform(0);
    shader.uniforms.glitchAmount = new THREE.Uniform(0);
    shader.uniforms.glitchDistance = new THREE.Uniform(1);

    shader.uniforms.bgColor = new THREE.Uniform(crtBgColor);
    shader.uniforms.fgColor = new THREE.Uniform(crtFgColor);

    shader.uniforms.crtPlaneOrigin = new THREE.Uniform(crtPlaneOrigin);
    shader.uniforms.crtPlaneNormal = new THREE.Uniform(crtPlaneNormal);
    shader.uniforms.crtPlaneTangent = new THREE.Uniform(crtPlaneTangent);
    shader.uniforms.crtPlaneBitangent = new THREE.Uniform(crtPlaneBitangent);

    // add parameter declarations after emissive map parameters
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_pars_fragment>',
      '#include <emissivemap_pars_fragment>\n' + fragmentParsChunk
    );

    // fully replace emissive map fragment (since we use that texture slot)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      fragmentChunk
    );

    // stash reference for later realtime updates
    crtShaderRef.current = shader;
  };

  return (
    <meshStandardMaterial
      {...standardParams}
      emissive={new THREE.Color('#ffffff')} // modulated in shader
      emissiveMap={displayTexture}
      onBeforeCompile={materialHandler}
    />
  );
};
