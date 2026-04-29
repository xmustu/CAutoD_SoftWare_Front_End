/**
 * geometryBuilder.js
 *
 * 前端几何体生成器：
 * 解析 AI 返回的 Markdown 参数表 → 生成 Three.js 几何体 → 导出 STL blob URL
 * 用于 Dify 模式或 Agent 未返回模型文件时的前端预览
 */
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";

// ---------------------------------------------------------------
// 1. 参数表解析
// ---------------------------------------------------------------

/**
 * 从 Markdown 文本中提取参数表
 * 支持格式：| `param_name` | 含义描述 | `10.0` |
 *
 * @param {string} markdownContent - AI 回复的 Markdown 文本
 * @returns {{ params: Object<string, number>, raw: Array<{name, desc, value}> }}
 */
export function parseParameterTable(markdownContent) {
  if (!markdownContent) return { params: {}, raw: [] };

  const raw = [];
  const params = {};

  // 匹配 Markdown 表格行：| xxx | xxx | xxx |
  const rowRegex =
    /\|\s*`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\|\s*(.+?)\s*\|\s*`?([\d.+-]+)`?\s*\|/g;

  let match;
  while ((match = rowRegex.exec(markdownContent)) !== null) {
    const name = match[1].trim();
    const desc = match[2].trim();
    const value = parseFloat(match[3].trim());

    // 跳过表头行（含"参数名"等中文标题）
    if (isNaN(value) || name === "参数名" || name === "参数") continue;

    raw.push({ name, desc, value });
    params[name] = value;
  }

  return { params, raw };
}

// ---------------------------------------------------------------
// 2. 几何体类型推断
// ---------------------------------------------------------------

/** 已知形状的参数签名 */
const SHAPE_SIGNATURES = [
  {
    type: "box",
    label: "立方体",
    requiredAny: [
      ["x_length", "y_length", "z_length"],
      ["length", "width", "height"],
    ],
    keywords: ["立方体", "长方体", "方块", "正方体", "box", "cube"],
  },
  {
    type: "cylinder",
    label: "圆柱体",
    requiredAny: [
      ["radius", "height"],
      ["r", "h"],
      ["top_radius", "bottom_radius", "height"],
    ],
    keywords: ["圆柱", "cylinder", "管"],
  },
  {
    type: "sphere",
    label: "球体",
    requiredAny: [["radius"], ["r"]],
    excludeParams: ["height", "h"],
    keywords: ["球体", "sphere", "圆球"],
  },
  {
    type: "cone",
    label: "圆锥体",
    requiredAny: [["radius", "height"]],
    keywords: ["圆锥", "cone"],
  },
  {
    type: "torus",
    label: "圆环体",
    requiredAny: [
      ["major_radius", "minor_radius"],
      ["ring_radius", "tube_radius"],
    ],
    keywords: ["圆环", "torus", "甜甜圈"],
  },
];

/**
 * 推断几何体类型
 * @param {Object<string, number>} params - 解析出的参数
 * @param {string} analysisText - AI 分析文本（用于关键词匹配）
 * @returns {{ type: string, label: string } | null}
 */
export function inferGeometryType(params, analysisText = "") {
  const paramNames = Object.keys(params);
  const text = analysisText.toLowerCase();

  for (const sig of SHAPE_SIGNATURES) {
    // 关键词匹配
    const keywordMatch = sig.keywords.some((kw) => text.includes(kw));

    // 参数签名匹配
    const paramMatch = sig.requiredAny?.some((required) =>
      required.every((p) => paramNames.includes(p))
    );

    // 排除参数检查
    const excluded = sig.excludeParams?.some((p) => paramNames.includes(p));

    if ((keywordMatch || paramMatch) && !excluded) {
      return { type: sig.type, label: sig.label };
    }
  }

  // 兜底：如果有 3 个长度类参数，尝试当作 box
  const lengthParams = paramNames.filter(
    (p) =>
      p.includes("length") ||
      p.includes("width") ||
      p.includes("height") ||
      p.includes("size")
  );
  if (lengthParams.length >= 3) {
    return { type: "box", label: "立方体(推测)" };
  }

  return null;
}

// ---------------------------------------------------------------
// 3. Three.js 几何体构建
// ---------------------------------------------------------------

/**
 * 根据类型和参数构建 Three.js 几何体
 * @param {string} type - 几何体类型
 * @param {Object<string, number>} params - 参数
 * @returns {THREE.BufferGeometry | null}
 */
export function buildGeometry(type, params) {
  const p = params;

  switch (type) {
    case "box": {
      const x = p.x_length || p.length || p.width || 10;
      const y = p.y_length || p.width || 10;
      const z = p.z_length || p.height || 10;
      return new THREE.BoxGeometry(x, z, y); // Three.js: (width, height, depth)
    }

    case "cylinder": {
      const rTop = p.top_radius || p.radius || p.r || 5;
      const rBot = p.bottom_radius || p.radius || p.r || 5;
      const h = p.height || p.h || 10;
      return new THREE.CylinderGeometry(rTop, rBot, h, 64);
    }

    case "sphere": {
      const r = p.radius || p.r || 5;
      return new THREE.SphereGeometry(r, 64, 64);
    }

    case "cone": {
      const r = p.radius || p.r || 5;
      const h = p.height || p.h || 10;
      return new THREE.ConeGeometry(r, h, 64);
    }

    case "torus": {
      const R = p.major_radius || p.ring_radius || 10;
      const r = p.minor_radius || p.tube_radius || 3;
      return new THREE.TorusGeometry(R, r, 32, 100);
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------
// 4. 应用偏移
// ---------------------------------------------------------------

/**
 * 应用位置偏移
 * @param {THREE.Mesh} mesh
 * @param {Object<string, number>} params
 */
function applyOffset(mesh, params) {
  const ox = params.offset_x || params.center_x || 0;
  const oy = params.offset_y || params.center_y || 0;
  const oz = params.offset_z || params.center_z || 0;
  mesh.position.set(ox, oz, oy); // Three.js Y-up → map Z to Y
}

// ---------------------------------------------------------------
// 5. 导出为 STL Blob URL
// ---------------------------------------------------------------

/**
 * 将 Three.js 几何体导出为 STL 格式的 Blob URL
 * @param {THREE.BufferGeometry} geometry
 * @param {Object<string, number>} params - 偏移参数
 * @returns {string} blob URL
 */
export function geometryToStlBlobUrl(geometry, params = {}) {
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  applyOffset(mesh, params);

  const exporter = new STLExporter();
  const stlString = exporter.parse(mesh);
  const blob = new Blob([stlString], { type: "application/octet-stream" });

  // 清理
  material.dispose();

  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------
// 6. 主入口：一键从 AI 文本生成 STL 预览
// ---------------------------------------------------------------

/**
 * 从 AI 回复文本中自动解析参数并生成 3D 预览 URL
 *
 * @param {string} aiContent - AI 的完整回复文本（Markdown）
 * @returns {{ blobUrl: string, geoType: object, params: object, raw: array } | null}
 *          成功时返回 blob URL 和解析信息，失败时返回 null
 */
export function generatePreviewFromAIResponse(aiContent) {
  if (!aiContent) return null;

  // 1. 解析参数表
  const { params, raw } = parseParameterTable(aiContent);
  if (Object.keys(params).length === 0) {
    console.log("[GeometryBuilder] 未在 AI 回复中找到参数表");
    return null;
  }
  console.log("[GeometryBuilder] 解析到参数:", params);

  // 2. 推断几何体类型
  const geoType = inferGeometryType(params, aiContent);
  if (!geoType) {
    console.log("[GeometryBuilder] 无法推断几何体类型");
    return null;
  }
  console.log("[GeometryBuilder] 推断类型:", geoType);

  // 3. 构建几何体
  const geometry = buildGeometry(geoType.type, params);
  if (!geometry) {
    console.log("[GeometryBuilder] 几何体构建失败");
    return null;
  }

  // 4. 导出 STL Blob URL
  const blobUrl = geometryToStlBlobUrl(geometry, params);
  geometry.dispose();

  console.log(
    `[GeometryBuilder] ✅ 前端预览模型已生成: ${geoType.label} (${geoType.type})`
  );

  return { blobUrl, geoType, params, raw };
}
