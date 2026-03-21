import { logger } from '../logger.js';

export interface Experiment {
  id: string;
  description: string;
  modification: string;
  baselineScore: number;
  newScore?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'discarded';
  startedAt: Date;
  completedAt?: Date;
}

export interface AutoresearchConfig {
  maxIterations: number;
  timeoutMinutes: number;
  metric: () => Promise<number>;
  improvements: Array<{
    description: string;
    modification: string;
    apply: () => Promise<void>;
    rollback: () => Promise<void>;
  }>;
}

export async function runAutoresearch(config: AutoresearchConfig): Promise<Experiment[]> {
  const experiments: Experiment[] = [];
  const deadline = Date.now() + config.timeoutMinutes * 60 * 1000;

  logger.info(
    { maxIterations: config.maxIterations, timeoutMinutes: config.timeoutMinutes },
    'Autoresearch starting',
  );

  // Get baseline
  const baseline = await config.metric();
  logger.info({ baseline }, 'Baseline metric captured');

  for (let i = 0; i < Math.min(config.maxIterations, config.improvements.length); i++) {
    if (Date.now() > deadline) {
      logger.warn('Autoresearch timeout reached');
      break;
    }

    const improvement = config.improvements[i];
    const experiment: Experiment = {
      id: `exp-${Date.now()}-${i}`,
      description: improvement.description,
      modification: improvement.modification,
      baselineScore: baseline,
      status: 'running',
      startedAt: new Date(),
    };
    experiments.push(experiment);

    logger.info({ experimentId: experiment.id, description: experiment.description }, 'Running experiment');

    try {
      // Apply modification
      await improvement.apply();

      // Measure new score
      const newScore = await config.metric();
      experiment.newScore = newScore;

      if (newScore > baseline) {
        experiment.status = 'success';
        logger.info(
          { experimentId: experiment.id, improvement: newScore - baseline },
          'Experiment succeeded — keeping modification',
        );
      } else {
        experiment.status = 'discarded';
        await improvement.rollback();
        logger.info(
          { experimentId: experiment.id, delta: newScore - baseline },
          'Experiment discarded — rolled back',
        );
      }
    } catch (err) {
      experiment.status = 'failed';
      try {
        await improvement.rollback();
      } catch (rollbackErr) {
        logger.error({ experimentId: experiment.id, rollbackErr }, 'Rollback failed');
      }
      logger.error({ experimentId: experiment.id, err }, 'Experiment failed');
    }

    experiment.completedAt = new Date();
  }

  logger.info(
    {
      total: experiments.length,
      succeeded: experiments.filter((e) => e.status === 'success').length,
      failed: experiments.filter((e) => e.status === 'failed').length,
    },
    'Autoresearch complete',
  );

  return experiments;
}

export function getExperimentSummary(experiments: Experiment[]): string {
  const lines = experiments.map((exp) => {
    const delta = exp.newScore !== undefined ? `(${exp.newScore > exp.baselineScore ? '+' : ''}${(exp.newScore - exp.baselineScore).toFixed(2)})` : '';
    return `- [${exp.status}] ${exp.description} ${delta}`;
  });

  return `# Experiment Results\n\n${lines.join('\n')}`;
}
