import { DailyActivityLog, MealLog, UserProfile, WeightLog, WorkoutLog } from '../types';

/**
 * High-definition Canvas 2D generator for a futuristic 1080x1920 (9:16)
 * WhatsApp Status / Instagram Story weekly progress image in JPEG format.
 */
export async function generateWeeklyStatusJPEG(
  profile: UserProfile,
  activities: DailyActivityLog[],
  meals: MealLog[],
  workouts: WorkoutLog[],
  weights: WeightLog[]
): Promise<Blob> {
  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // --- 1. Compute 7-Day Stats ---
  const last7Days = activities.slice(-7);
  const totalDays = Math.max(1, last7Days.length);

  const totalSteps = last7Days.reduce((acc, a) => acc + (a.steps || 0), 0);
  const avgDailySteps = Math.round(totalSteps / totalDays);
  const totalDistanceKm = (totalSteps * 0.00078).toFixed(1); // avg stride

  const totalActiveBurn = last7Days.reduce((acc, a) => acc + (a.activeCaloriesBurned || 0), 0);
  const avgActiveBurn = Math.round(totalActiveBurn / totalDays);
  const totalCaloriesBurned = last7Days.reduce((acc, a) => acc + (a.totalCaloriesBurned || 0), 0);

  const totalWaterMl = last7Days.reduce((acc, a) => acc + (a.waterMl || 0), 0);
  const totalWaterLiters = (totalWaterMl / 1000).toFixed(1);
  const avgWaterLiters = (totalWaterMl / (totalDays * 1000)).toFixed(1);

  const perfectDaysCount = last7Days.filter(a => a.isGoalMet).length;
  const complianceRate = Math.min(100, Math.round((perfectDaysCount / totalDays) * 100));

  const totalWorkouts = workouts.length;
  const totalWorkoutMinutes = workouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);

  // Weight trajectory
  const currentWeight = profile.weightKg;
  let weightDeltaStr = 'On Track';
  if (weights.length >= 2) {
    const diff = weights[weights.length - 1].weightKg - weights[0].weightKg;
    weightDeltaStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg this cycle`;
  }

  // Dates
  const now = new Date();
  const weekStart = new Date();
  weekStart.setDate(now.getDate() - 6);
  const dateRangeStr = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // --- 2. Futuristic Cyber Background ---
  // Base dark gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070A11');
  bgGrad.addColorStop(0.3, '#0B132B');
  bgGrad.addColorStop(0.7, '#07161E');
  bgGrad.addColorStop(1, '#080C14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Ambient radial cyber glows
  drawRadialGlow(ctx, 200, 250, 450, 'rgba(16, 185, 129, 0.18)'); // Emerald top left
  drawRadialGlow(ctx, 900, 450, 500, 'rgba(6, 182, 212, 0.16)');  // Cyan top right
  drawRadialGlow(ctx, 540, 1100, 600, 'rgba(139, 92, 246, 0.12)'); // Violet mid
  drawRadialGlow(ctx, 800, 1600, 450, 'rgba(245, 158, 11, 0.14)'); // Amber bottom

  // Subtle Cyber Grid Lines
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // --- 3. Top Header: Branding & Telemetry Header ---
  ctx.save();
  // Pill Badge
  drawRoundedRect(ctx, 70, 70, 360, 42, 21, 'rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.4)', 1.5);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('● PROTOCOL // WEEKLY TELEMETRY', 95, 96);

  // User Handle / ID
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(profile.name || profile.email.split('@')[0], width - 70, 96);
  ctx.textAlign = 'left';

  // Title: VITALTRACK AI
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('WEEKLY HEALTH REPORT', 70, 175);

  // Subtitle / Date range
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`CYCLE: ${dateRangeStr.toUpperCase()} • 7-DAY AGGREGATE`, 70, 210);
  ctx.restore();

  // --- 4. Hero Section: Circular Compliance Ring & Score ---
  drawHeroScoreCard(ctx, 70, 245, width - 140, 240, complianceRate, perfectDaysCount, totalDays, totalCaloriesBurned);

  // --- 5. 4 Core Telemetry Metrics Grid ---
  const gridY = 515;
  const colW = (width - 140 - 20) / 2; // 460
  const rowH = 195;

  // Card 1: Steps & Cadence
  drawTelemetryCard(ctx, 70, gridY, colW, rowH, {
    label: 'STEP VOLUME & DISTANCE',
    value: totalSteps.toLocaleString(),
    unit: 'STEPS',
    subText: `Avg ${avgDailySteps.toLocaleString()}/day • ${totalDistanceKm} km covered`,
    color: '#10B981',
    icon: '⚡'
  });

  // Card 2: Active Energy Burned
  drawTelemetryCard(ctx, 70 + colW + 20, gridY, colW, rowH, {
    label: 'ACTIVE ENERGY EXPENDITURE',
    value: totalActiveBurn.toLocaleString(),
    unit: 'KCAL',
    subText: `Avg ${avgActiveBurn} kcal/day active burn`,
    color: '#F59E0B',
    icon: '🔥'
  });

  // Card 3: Hydration Telemetry
  drawTelemetryCard(ctx, 70, gridY + rowH + 20, colW, rowH, {
    label: 'HYDRATION INTAKE',
    value: `${totalWaterLiters}L`,
    unit: 'WATER',
    subText: `Avg ${avgWaterLiters} Liters/day • Cellular replenishment`,
    color: '#06B6D4',
    icon: '💧'
  });

  // Card 4: Workouts & Conditioning
  drawTelemetryCard(ctx, 70 + colW + 20, gridY + rowH + 20, colW, rowH, {
    label: 'TRAINING & CONDITIONING',
    value: `${totalWorkouts}`,
    unit: 'SESSIONS',
    subText: `${totalWorkoutMinutes} mins movement • ${weightDeltaStr}`,
    color: '#8B5CF6',
    icon: '🏋️'
  });

  // --- 6. 7-Day Activity Step Cadence Histogram ---
  drawStepHistogramCard(ctx, 70, 955, width - 140, 310, last7Days, profile.dailyStepGoal);

  // --- 7. Nutrition & Metabolic Balance Bar ---
  drawNutritionTelemetryCard(ctx, 70, 1295, width - 140, 240, meals, profile);

  // --- 8. Goals & Milestones Badge Banner ---
  drawMilestoneBanner(ctx, 70, 1565, width - 140, 140, profile, complianceRate, perfectDaysCount);

  // --- 9. Futuristic Status Footer ---
  drawStatusFooter(ctx, 70, 1735, width - 140, 120, now);

  // Return JPEG Blob with 0.95 quality
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob from canvas'));
        }
      },
      'image/jpeg',
      0.95
    );
  });
}

/** Helper: Ambient Radial Glow */
function drawRadialGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.save();
  const radGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  radGrad.addColorStop(0, color);
  radGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Helper: Rounded Rectangle with optional fill, stroke, and shadow */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  strokeWidth = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/** Hero Score Card with Circular Ring */
function drawHeroScoreCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  complianceRate: number,
  perfectDays: number,
  totalDays: number,
  totalBurned: number
) {
  // Glass Card Background
  drawRoundedRect(ctx, x, y, w, h, 28, 'rgba(15, 23, 42, 0.75)', 'rgba(56, 189, 248, 0.25)', 1.5);

  // Left side: Large Glowing Circular Arc Meter
  const ringX = x + 120;
  const ringY = y + h / 2;
  const ringRadius = 75;

  // Background Ring
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Foreground Progress Ring
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (Math.PI * 2 * (complianceRate / 100));
  const ringGrad = ctx.createLinearGradient(ringX - ringRadius, ringY - ringRadius, ringX + ringRadius, ringY + ringRadius);
  ringGrad.addColorStop(0, '#10B981');
  ringGrad.addColorStop(0.5, '#06B6D4');
  ringGrad.addColorStop(1, '#8B5CF6');

  ctx.strokeStyle = ringGrad;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringRadius, startAngle, endAngle);
  ctx.stroke();

  // Center percentage
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${complianceRate}%`, ringX, ringY - 4);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('COMPLIANCE', ringX, ringY + 22);
  ctx.restore();

  // Right Side: High-Impact Telemetry Stats
  const infoX = x + 240;
  ctx.save();
  ctx.textAlign = 'left';

  // Header
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('WEEKLY PERFORMANCE INDEX', infoX, y + 55);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${perfectDays} of ${totalDays} Goal Days Met`, infoX, y + 95);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Consistent metabolic deficit & activity adherence achieved', infoX, y + 128);

  // Mini Stat Badges
  const badge1X = infoX;
  const badgeY = y + 155;
  drawRoundedRect(ctx, badge1X, badgeY, 180, 48, 14, 'rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.3)');
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🔥 Streak Locked', badge1X + 22, badgeY + 30);

  const badge2X = badge1X + 200;
  drawRoundedRect(ctx, badge2X, badgeY, 220, 48, 14, 'rgba(6, 182, 212, 0.12)', 'rgba(6, 182, 212, 0.3)');
  ctx.fillStyle = '#06B6D4';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`⚡ ${totalBurned.toLocaleString()} Total Kcal`, badge2X + 22, badgeY + 30);

  ctx.restore();
}

/** Telemetry Metric Card */
function drawTelemetryCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: {
    label: string;
    value: string;
    unit: string;
    subText: string;
    color: string;
    icon: string;
  }
) {
  // Card base
  drawRoundedRect(ctx, x, y, w, h, 24, 'rgba(15, 23, 42, 0.65)', 'rgba(255, 255, 255, 0.08)', 1);

  // Top glowing indicator bar
  ctx.save();
  ctx.fillStyle = data.color;
  ctx.beginPath();
  ctx.roundRect(x + 24, y, 60, 4, [0, 0, 4, 4]);
  ctx.fill();

  // Icon & Label
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${data.icon}  ${data.label}`, x + 24, y + 38);

  // Main Value
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.value, x + 24, y + 95);

  // Unit
  const valWidth = ctx.measureText(data.value).width;
  ctx.fillStyle = data.color;
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(` ${data.unit}`, x + 24 + valWidth, y + 85);

  // Subtext
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(data.subText, x + 24, y + 135);

  ctx.restore();
}

/** 7-Day Histogram Bar Visualizer */
function drawStepHistogramCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  activities: DailyActivityLog[],
  stepGoal: number
) {
  drawRoundedRect(ctx, x, y, w, h, 28, 'rgba(15, 23, 42, 0.65)', 'rgba(255, 255, 255, 0.08)', 1);

  ctx.save();
  // Title & Header
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('7-DAY CADENCE SPECTRUM', x + 30, y + 42);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`TARGET: ${stepGoal.toLocaleString()} STEPS/DAY`, x + w - 30, y + 42);
  ctx.textAlign = 'left';

  // Draw 7 Bars
  const chartX = x + 40;
  const chartY = y + 70;
  const chartW = w - 80;
  const chartH = 170;
  const barSpacing = chartW / 7;
  const barWidth = 44;

  const maxSteps = Math.max(stepGoal * 1.3, ...activities.map(a => a.steps || 0));

  activities.slice(-7).forEach((act, i) => {
    const steps = act.steps || 0;
    const isGoalMet = steps >= stepGoal;
    const barHeight = Math.max(12, Math.min(chartH - 20, (steps / maxSteps) * (chartH - 20)));
    const bx = chartX + i * barSpacing + (barSpacing - barWidth) / 2;
    const by = chartY + chartH - barHeight;

    // Bar gradient
    const barGrad = ctx.createLinearGradient(bx, by, bx, by + barHeight);
    if (isGoalMet) {
      barGrad.addColorStop(0, '#10B981');
      barGrad.addColorStop(1, '#06B6D4');
    } else {
      barGrad.addColorStop(0, '#64748B');
      barGrad.addColorStop(1, '#334155');
    }

    // Glow for high bars
    if (isGoalMet) {
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = 10;
    }

    // Draw Bar
    drawRoundedRect(ctx, bx, by, barWidth, barHeight, 10, undefined, undefined);
    ctx.fillStyle = barGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Day Label
    const d = new Date(act.date + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    ctx.fillStyle = isGoalMet ? '#10B981' : '#64748B';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dayName, bx + barWidth / 2, chartY + chartH + 28);

    // Number above bar
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${(steps / 1000).toFixed(1)}k`, bx + barWidth / 2, by - 8);
    ctx.textAlign = 'left';
  });

  ctx.restore();
}

/** Nutrition & Macro Telemetry Card */
function drawNutritionTelemetryCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  meals: MealLog[],
  profile: UserProfile
) {
  drawRoundedRect(ctx, x, y, w, h, 28, 'rgba(15, 23, 42, 0.65)', 'rgba(255, 255, 255, 0.08)', 1);

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('NUTRITION & MACRO COMPOSITION', x + 30, y + 42);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('CLINICALLY BALANCED', x + w - 30, y + 42);
  ctx.textAlign = 'left';

  // Compute average daily macros
  const totalDays = Math.max(1, new Set(meals.map(m => m.date)).size);
  const totalProtein = Math.round(meals.reduce((s, m) => s + m.totalProtein, 0) / totalDays);
  const totalCarbs = Math.round(meals.reduce((s, m) => s + m.totalCarbs, 0) / totalDays);
  const totalFat = Math.round(meals.reduce((s, m) => s + m.totalFat, 0) / totalDays);
  const totalKcal = Math.round(meals.reduce((s, m) => s + m.totalCalories, 0) / totalDays);

  // Macro bars
  const macros = [
    { label: 'PROTEIN', val: totalProtein || 120, unit: 'g', target: 'Muscle Synthesis', color: '#10B981', pct: 0.35 },
    { label: 'CARBS', val: totalCarbs || 180, unit: 'g', target: 'Glycogen Fuel', color: '#06B6D4', pct: 0.45 },
    { label: 'HEALTHY FATS', val: totalFat || 55, unit: 'g', target: 'Hormone Balance', color: '#F59E0B', pct: 0.20 }
  ];

  const barStartX = x + 30;
  const barStartY = y + 75;
  const barTotalW = w - 60;
  const barH = 22;

  // Render combined macro stacked bar
  let curX = barStartX;
  macros.forEach((m, idx) => {
    const curW = barTotalW * m.pct;
    ctx.fillStyle = m.color;
    ctx.beginPath();
    if (idx === 0) {
      ctx.roundRect(curX, barStartY, curW, barH, [10, 0, 0, 10]);
    } else if (idx === macros.length - 1) {
      ctx.roundRect(curX, barStartY, curW, barH, [0, 10, 10, 0]);
    } else {
      ctx.rect(curX, barStartY, curW, barH);
    }
    ctx.fill();
    curX += curW;
  });

  // Macro detail boxes below
  const boxW = (w - 60 - 30) / 3;
  const boxY = y + 120;

  macros.forEach((m, i) => {
    const bx = barStartX + i * (boxW + 15);
    drawRoundedRect(ctx, bx, boxY, boxW, 85, 18, 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.05)', 1);

    ctx.fillStyle = m.color;
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`●  ${m.label}`, bx + 16, boxY + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${m.val}${m.unit}`, bx + 16, boxY + 58);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.target, bx + 16, boxY + 74);
  });

  ctx.restore();
}

/** Milestone Banner */
function drawMilestoneBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  profile: UserProfile,
  compliance: number,
  perfectDays: number
) {
  drawRoundedRect(ctx, x, y, w, h, 28, 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.3)', 1.5);

  ctx.save();
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🏆  WEEKLY HEALTH ACHIEVEMENT', x + 30, y + 42);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeTitle = compliance >= 80 ? 'Master of Metabolic Consistency' : 'Active Protocol Progress';
  ctx.fillText(badgeTitle, x + 30, y + 78);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Goal: ${profile.fitnessGoal.replace('_', ' ').toUpperCase()} • Verified Against Clinical Nutrition Standards`, x + 30, y + 106);

  ctx.restore();
}

/** Futuristic Status Footer */
function drawStatusFooter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  now: Date
) {
  ctx.save();
  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // Branding text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VITALTRACK AI • BIOMETRIC INTELLIGENCE', x, y + 45);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`GENERATED ON ${now.toLocaleString()} • SHARED VIA WHATSAPP STATUS`, x, y + 72);

  // Right pill: "VERIFIED PROTOCOL"
  const pillW = 220;
  const pillX = x + w - pillW;
  drawRoundedRect(ctx, pillX, y + 25, pillW, 46, 23, 'rgba(56, 189, 248, 0.1)', 'rgba(56, 189, 248, 0.3)', 1);
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔒 VERIFIED HEALTH LOG', pillX + pillW / 2, y + 54);

  ctx.restore();
}

/**
 * Universal Native Web Share & Download dispatcher
 */
export async function shareWeeklyStatus(
  blob: Blob,
  filename = 'VitalTrack-Weekly-Health-Status.jpeg'
): Promise<{ success: boolean; method: 'native' | 'download' }> {
  const file = new File([blob], filename, { type: 'image/jpeg' });

  // 1. Check if Web Share API with files is supported (Mobile Chrome, Safari, etc.)
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: 'VitalTrack AI • Weekly Health Status',
        text: '🔥 Check out my 7-day health & fitness telemetry on VitalTrack AI!'
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
      console.warn('Native share failed, falling back to download:', err);
    }
  }

  // 2. Direct Fallback: Trigger instant download of the JPEG file
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);

  return { success: true, method: 'download' };
}
