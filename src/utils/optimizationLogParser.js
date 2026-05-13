/**
 * 优化日志解析器
 * 从设计优化任务的流式文本日志中提取结构化数据：
 *   - 初始参数 / 边界
 *   - 每次仿真的 (体积, 应力)
 *   - 每代 best
 *   - 算法配置
 *
 * 输入：完整的日志字符串（assistant message.content）
 * 输出：结构化对象，便于 BeforeAfterPanel 渲染前后对比
 */

const numberRe = '[\\d.eE+-]+';

export const parseOptimizationLog = (content) => {
  const empty = {
    initial: null,
    best: null,
    history: [],
    simulations: [],
    initialParams: [],
    paramRanges: [],
    settings: {
      method: null,
      generations: null,
      population: null,
      permissibleStress: null,
    },
  };

  if (!content || typeof content !== 'string') return empty;

  // 1. 初始参数：info：获取到参数N：name = value
  const initialParams = [];
  const paramRe = new RegExp(`info[:：]\\s*获取到参数\\d+[:：]\\s*(.+?)\\s*=\\s*(${numberRe})`, 'g');
  let m;
  while ((m = paramRe.exec(content)) !== null) {
    const v = parseFloat(m[2]);
    if (!Number.isNaN(v)) initialParams.push({ name: m[1].trim(), value: v });
  }

  // 2. 参数范围：获取到参数N： name：[min, max]
  const paramRanges = [];
  const rangeRe = new RegExp(`获取到参数\\d+[：:]\\s*(.+?)[：:]\\s*\\[\\s*(${numberRe})\\s*,\\s*(${numberRe})\\s*\\]`, 'g');
  while ((m = rangeRe.exec(content)) !== null) {
    const mn = parseFloat(m[2]);
    const mx = parseFloat(m[3]);
    if (!Number.isNaN(mn) && !Number.isNaN(mx)) {
      paramRanges.push({ name: m[1].trim(), min: mn, max: mx });
    }
  }

  // 3. 仿真完成（原始组#X，总计数#Y）：体积=V, 应力=S
  const simulations = [];
  const simRe = new RegExp(`仿真完成[^\\n]*?总计数#(\\d+)[^\\n]*?体积=(${numberRe})\\s*,\\s*应力=(${numberRe})`, 'g');
  while ((m = simRe.exec(content)) !== null) {
    const idx = parseInt(m[1], 10);
    const vol = parseFloat(m[2]);
    const str = parseFloat(m[3]);
    if (!Number.isNaN(vol) && !Number.isNaN(str)) {
      simulations.push({ index: idx, volume: vol, stress: str });
    }
  }

  // 4. 每代 best：format "N | cv | volume | stress"
  // 例：1 | 0 | 0.0008 | 940801472.0000000000
  const history = [];
  const genRe = new RegExp(
    `^\\s*(\\d+)\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*$`,
    'gm'
  );
  while ((m = genRe.exec(content)) !== null) {
    const gen = parseInt(m[1], 10);
    const cv = parseFloat(m[2]);
    const vol = parseFloat(m[3]);
    const str = parseFloat(m[4]);
    if (![cv, vol, str].some(Number.isNaN)) {
      history.push({ generation: gen, cv, volume: vol, stress: str });
    }
  }

  // 5. 设置
  const methodMatch = content.match(/优化算法[：:]\s*([A-Za-z]+)/);
  const generationsMatch = content.match(/迭代代数[：:]\s*(\d+)/);
  const populationMatch = content.match(/种群大小[：:]\s*(\d+)/);
  const stressMatch = content.match(new RegExp(`许用[最大]*应力[：:]\\s*(${numberRe})`));

  // 6. 初始 / 当前最优
  const initial = simulations.length > 0 ? { ...simulations[0] } : null;

  // best：优先用每代 best 历史的最后一条；否则用所有 simulations 中体积最小的
  let best = null;
  if (history.length > 0) {
    const last = history[history.length - 1];
    best = { generation: last.generation, volume: last.volume, stress: last.stress };
  } else if (simulations.length > 0) {
    best = simulations.reduce((a, b) => (a.volume <= b.volume ? a : b));
  }

  return {
    initial,
    best,
    history,
    simulations,
    initialParams,
    paramRanges,
    settings: {
      method: methodMatch ? methodMatch[1] : null,
      generations: generationsMatch ? parseInt(generationsMatch[1], 10) : null,
      population: populationMatch ? parseInt(populationMatch[1], 10) : null,
      permissibleStress: stressMatch ? parseFloat(stressMatch[1]) : null,
    },
  };
};

// 单位换算辅助
export const formatVolume = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  // 后端体积单位为 m³，换算成 cm³ 更直观
  return `${(v * 1e6).toFixed(2)} cm³`;
};

export const formatStress = (s) => {
  if (s == null || Number.isNaN(s)) return '—';
  // 后端应力单位为 Pa，换算成 MPa
  return `${(s / 1e6).toFixed(1)} MPa`;
};

export const formatPercent = (before, after) => {
  if (before == null || after == null || before === 0) return '—';
  const pct = ((after - before) / Math.abs(before)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
};
