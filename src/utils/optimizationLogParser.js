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
    finalResult: null,
    duration: null,
    constraintSatisfied: null,
    isComplete: false,
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

  // 4. 每代 best 表格：兼容两种格式
  //    旧格式（4 列）："N | cv | volume | stress"
  //    新格式（6 列）："n_gen | n_eval | cv_min | cv_avg | f_avg | f_min"  (f_min = 最优体积)
  const history = [];
  const gen6Re = new RegExp(
    `^\\s*(\\d+)\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*$`,
    'gm'
  );
  while ((m = gen6Re.exec(content)) !== null) {
    const gen = parseInt(m[1], 10);
    const nEval = parseFloat(m[2]);
    const cvMin = parseFloat(m[3]);
    const fMin = parseFloat(m[6]);
    if (![nEval, cvMin, fMin].some(Number.isNaN)) {
      history.push({ generation: gen, nEval, cv: cvMin, volume: fMin, stress: null });
    }
  }
  // 兜底：若 6 列未匹配，再试 4 列旧格式
  if (history.length === 0) {
    const gen4Re = new RegExp(
      `^\\s*(\\d+)\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*\\|\\s*(${numberRe})\\s*$`,
      'gm'
    );
    while ((m = gen4Re.exec(content)) !== null) {
      const gen = parseInt(m[1], 10);
      const cv = parseFloat(m[2]);
      const vol = parseFloat(m[3]);
      const str = parseFloat(m[4]);
      if (![cv, vol, str].some(Number.isNaN)) {
        history.push({ generation: gen, cv, volume: vol, stress: str });
      }
    }
  }

  // 5. 设置
  const methodMatch = content.match(/优化算法[：:]\s*([A-Za-z]+)/);
  const generationsMatch = content.match(/迭代代数[：:]\s*(\d+)/);
  const populationMatch = content.match(/种群大小[：:]\s*(\d+)/);
  const stressMatch = content.match(new RegExp(`许用[最大]*应力[：:]\\s*(${numberRe})`));

  // 6. 权威最优结果（=== 优化结果详细信息 === 块）
  //    例：
  //      2. 最优体积：0.000631
  //      3. 最优应力：93387016.000000
  //      4. 约束条件：最大允许应力 = 355000000.000000
  //         ✅ 符合约束要求
  let finalResult = null;
  const finalVolMatch = content.match(new RegExp(`最优体积[：:]\\s*(${numberRe})`));
  const finalStressMatch = content.match(new RegExp(`最优应力[：:]\\s*(${numberRe})`));
  if (finalVolMatch || finalStressMatch) {
    finalResult = {
      volume: finalVolMatch ? parseFloat(finalVolMatch[1]) : null,
      stress: finalStressMatch ? parseFloat(finalStressMatch[1]) : null,
    };
  }

  // 最优参数表（=== 优化结果详细信息 === 块内）
  const finalParams = [];
  const finalParamSection = content.match(/最优参数[：:][\s\S]*?(?:\d+\.\s*最优体积|$)/);
  if (finalParamSection) {
    const finalParamRe = new RegExp(`([A-Za-z_\\u4e00-\\u9fa5][^：:\\s]*)[：:]\\s*(${numberRe})`, 'g');
    let pm;
    while ((pm = finalParamRe.exec(finalParamSection[0])) !== null) {
      const v = parseFloat(pm[2]);
      if (!Number.isNaN(v) && pm[1] !== '最优体积' && pm[1] !== '最优应力') {
        finalParams.push({ name: pm[1].trim(), value: v });
      }
    }
  }
  if (finalParams.length > 0 && finalResult) finalResult.params = finalParams;

  // 7. 约束满足、耗时、完成标志
  const constraintSatisfied = /符合约束要求/.test(content)
    ? true
    : /不符合约束要求|约束.*?不满足/.test(content)
      ? false
      : null;

  const durationMatch = content.match(new RegExp(`优化完成[，,]\\s*耗时[：:]\\s*(${numberRe})\\s*秒`));
  const duration = durationMatch ? parseFloat(durationMatch[1]) : null;
  const isComplete = /优化完成/.test(content);

  // 8. 初始 / 当前最优
  const initial = simulations.length > 0 ? { ...simulations[0] } : null;

  // best 优先级：finalResult (权威) > history 末尾 > simulations 最小
  let best = null;
  if (finalResult && finalResult.volume != null) {
    best = {
      volume: finalResult.volume,
      stress: finalResult.stress,
      generation: history.length > 0 ? history[history.length - 1].generation : null,
      source: 'final',
    };
  } else if (history.length > 0) {
    const last = history[history.length - 1];
    best = { generation: last.generation, volume: last.volume, stress: last.stress, source: 'history' };
  } else if (simulations.length > 0) {
    const minVol = simulations.reduce((a, b) => (a.volume <= b.volume ? a : b));
    best = { ...minVol, source: 'simulations' };
  }

  return {
    initial,
    best,
    history,
    simulations,
    initialParams,
    paramRanges,
    finalResult,
    duration,
    constraintSatisfied,
    isComplete,
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
