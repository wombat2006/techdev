/**
 * Gemini-Style Thinking Visualization
 * Dynamic thought process animation
 */

class ThinkingVisualization {
    constructor() {
        this.currentStep = 0;
        this.steps = document.querySelectorAll('.thinking-step');
        this.consensusValue = 70;
        this.init();
    }

    init() {
        // Start animation after page load
        setTimeout(() => {
            this.animateThinking();
        }, 1000);
    }

    animateThinking() {
        // Animate steps sequentially
        this.steps.forEach((step, index) => {
            setTimeout(() => {
                // Remove previous active
                this.steps.forEach(s => s.classList.remove('active'));

                // Set current as active
                step.classList.remove('future');
                step.classList.add('active');

                // Animate consensus meter
                if (index >= 3) {
                    this.animateConsensus();
                }
            }, index * 2000);
        });

        // Restart animation after completion
        setTimeout(() => {
            this.reset();
            this.animateThinking();
        }, this.steps.length * 2000 + 3000);
    }

    animateConsensus() {
        const meterFill = document.querySelector('.meter-fill');
        const meterValue = document.querySelector('.meter-value');

        if (!meterFill || !meterValue) return;

        let currentValue = this.consensusValue;
        const targetValue = Math.min(currentValue + Math.floor(Math.random() * 10), 98);

        const duration = 1000;
        const steps = 50;
        const increment = (targetValue - currentValue) / steps;
        const stepDuration = duration / steps;

        let step = 0;
        const interval = setInterval(() => {
            currentValue += increment;
            step++;

            meterFill.style.width = currentValue + '%';
            meterValue.textContent = Math.floor(currentValue) + '%';

            if (step >= steps) {
                clearInterval(interval);
                this.consensusValue = targetValue;
            }
        }, stepDuration);
    }

    reset() {
        this.steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index > 3) {
                step.classList.add('future');
            }
        });
        this.consensusValue = 70;
        const meterFill = document.querySelector('.meter-fill');
        const meterValue = document.querySelector('.meter-value');
        if (meterFill) meterFill.style.width = '70%';
        if (meterValue) meterValue.textContent = '70%';
    }

    // Simulate LLM response timing
    simulateLLMResponses() {
        const checks = document.querySelectorAll('.llm-check');
        checks.forEach((check, index) => {
            setTimeout(() => {
                check.classList.remove('pending');
                const icon = check.querySelector('i');
                icon.className = 'fas fa-check-circle';

                const text = check.querySelector('span');
                text.textContent = text.textContent.replace('検証中', '承認');
            }, (index + 1) * 1500);
        });
    }
}

// Thinking process content variations
const thinkingScenarios = [
    {
        steps: [
            {
                icon: 'user-circle',
                label: 'ユーザの要求分析',
                text: 'ユーザは「Prometheusのターゲット数が少ないのでは？」という疑問を持っている'
            },
            {
                icon: 'search',
                label: '状況調査',
                text: '現在のPrometheusターゲットを確認する必要がある。監視対象のサービスリストと比較'
            },
            {
                icon: 'lightbulb',
                label: '解決策の立案',
                text: '不足しているターゲット（Grafana、Node Exporter、Redis Exporter）を追加する計画'
            },
            {
                icon: 'sync-alt',
                label: 'Wall-Bounce検証',
                text: '複数LLMによる解決策の妥当性検証中...'
            },
            {
                icon: 'rocket',
                label: '実装・検証',
                text: '合意された解決策を実装し、動作確認を行う'
            }
        ]
    },
    {
        steps: [
            {
                icon: 'user-circle',
                label: 'ユーザの要求理解',
                text: 'ユーザは「メトリクスの永続化」を求めている。再起動時のデータ消失を防ぎたい'
            },
            {
                icon: 'database',
                label: 'データ構造分析',
                text: 'Prometheusメトリクスの保存形式とRedis永続化の互換性を確認'
            },
            {
                icon: 'code',
                label: '実装戦略',
                text: 'persistMetrics/restoreMetrics関数を実装。5分ごとの自動保存とシグナルハンドラー'
            },
            {
                icon: 'sync-alt',
                label: 'Wall-Bounce検証',
                text: '複数LLMによる実装の正確性検証...'
            },
            {
                icon: 'check-circle',
                label: '動作確認',
                text: '実装完了。テストケースで永続化機能を検証'
            }
        ]
    }
];

// Randomly rotate scenarios
function rotateScenario() {
    const scenario = thinkingScenarios[Math.floor(Math.random() * thinkingScenarios.length)];
    const stream = document.querySelector('.thinking-stream');

    if (!stream) return;

    // Update steps with new scenario
    const steps = stream.querySelectorAll('.thinking-step');
    steps.forEach((step, index) => {
        if (scenario.steps[index]) {
            const header = step.querySelector('.step-header');
            const icon = header.querySelector('i');
            const label = header.querySelector('.step-label');
            const text = step.querySelector('.step-text');

            icon.className = `fas fa-${scenario.steps[index].icon}`;
            label.textContent = scenario.steps[index].label;
            text.textContent = scenario.steps[index].text;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const viz = new ThinkingVisualization();

    // Rotate scenarios every 30 seconds
    setInterval(() => {
        rotateScenario();
    }, 30000);
});