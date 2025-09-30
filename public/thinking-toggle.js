/**
 * Real-time Thinking Process Display (Gemini Style)
 * Streams actual Wall-Bounce analysis thinking in real-time
 */

class ThinkingProcessDisplay {
    constructor() {
        this.isExpanded = false;
        this.currentStepIndex = 0;
        this.stepBuffer = []; // Buffer to store all thinking steps
        this.consensusHistory = []; // Buffer to store consensus scores
        this.eventSource = null;
        this.isBuffering = true; // Always buffer thinking steps

        this.toggleBtn = document.getElementById('thinking-toggle');
        this.display = document.getElementById('thinking-display');
        this.stream = document.getElementById('thinking-stream');
        this.statusText = document.getElementById('thinking-status-text');
        this.consensusValue = document.getElementById('consensus-value');
        this.consensusFill = document.getElementById('consensus-fill');

        // Inquiry form elements
        this.inquiryForm = document.getElementById('inquiry-form');
        this.inquiryInput = document.getElementById('inquiry-input');
        this.submitBtn = this.inquiryForm?.querySelector('.inquiry-submit-btn');

        this.init();
    }

    init() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        if (this.inquiryForm) {
            this.inquiryForm.addEventListener('submit', (e) => this.handleInquirySubmit(e));
        }
    }

    toggle() {
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    expand() {
        this.isExpanded = true;

        if (this.display) {
            this.display.classList.remove('collapsed');
            this.display.classList.add('expanded');
            this.toggleBtn.classList.add('expanded');
            this.toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>Hide Thinking Process';

            // Show buffered steps when display is opened
            this.renderBufferedSteps();
        }
    }

    collapse() {
        this.isExpanded = false;

        if (this.display) {
            this.display.classList.remove('expanded');
            this.display.classList.add('collapsed');
            this.toggleBtn.classList.remove('expanded');
            this.toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>Show Thinking Process';
        }
    }

    async handleInquirySubmit(e) {
        e.preventDefault();

        const question = this.inquiryInput.value.trim();
        if (!question) return;

        // Disable submit button
        if (this.submitBtn) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Processing...';
        }

        // Expand thinking process automatically
        if (!this.isExpanded) {
            this.expand();
        }

        // Clear previous steps
        this.stepBuffer = [];
        this.consensusHistory = [];
        this.stream.innerHTML = '';

        // Start processing with Wall-Bounce
        try {
            await this.processWallBounceAnalysis(question);
        } catch (error) {
            this.addStepToDOM({
                icon: 'exclamation-triangle',
                label: 'Error',
                text: `Failed to process inquiry: ${error.message}`,
                provider: 'System',
                timestamp: Date.now()
            }, true);
        } finally {
            // Re-enable submit button
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>Submit';
            }
        }
    }

    async processWallBounceAnalysis(question) {
        // Call backend Wall-Bounce API with simple JSON response
        try {
            const response = await fetch('/api/v1/wall-bounce/analyze-simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    taskType: 'basic',
                    executionMode: 'parallel'
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Analysis failed');
            }

            // Display each provider's response as a step
            data.steps.forEach((step, index) => {
                this.bufferStep({
                    icon: this.getProviderIcon(step.provider),
                    label: `${step.provider} Analysis`,
                    text: step.response,
                    provider: step.provider,
                    timestamp: Date.now() + index
                });

                if (this.isExpanded) {
                    this.renderLatestStep();
                }
            });

            // Update consensus score
            if (data.consensus && data.consensus.confidence) {
                const consensusPercent = Math.round(data.consensus.confidence * 100);
                this.bufferConsensus(consensusPercent);
                this.updateConsensusDisplay(consensusPercent);
            }

            // Update status to complete
            if (this.statusText) {
                this.statusText.textContent = 'Complete';
            }

        } catch (error) {
            throw error;
        }
    }

    getProviderIcon(provider) {
        const icons = {
            'gpt-5': 'brain',
            'gemini-2.5-pro': 'lightbulb',
            'claude-sonnet-4': 'check-circle',
            'claude-opus-4.1': 'rocket'
        };
        return icons[provider.toLowerCase()] || 'cog';
    }


    /**
     * Buffer a thinking step for later retrieval
     */
    bufferStep(stepData) {
        this.stepBuffer.push({
            ...stepData,
            timestamp: stepData.timestamp || Date.now()
        });

        // Keep buffer size manageable (last 100 steps)
        if (this.stepBuffer.length > 100) {
            this.stepBuffer.shift();
        }
    }

    /**
     * Buffer consensus score
     */
    bufferConsensus(value) {
        this.consensusHistory.push({
            value,
            timestamp: Date.now()
        });

        if (this.consensusHistory.length > 100) {
            this.consensusHistory.shift();
        }
    }

    /**
     * Render all buffered steps when display is opened
     */
    renderBufferedSteps() {
        this.stream.innerHTML = '';

        if (this.stepBuffer.length === 0) {
            this.stream.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">No thinking process recorded yet. Waiting for Wall-Bounce analysis...</p>';
            return;
        }

        // Render all buffered steps
        this.stepBuffer.forEach((step, index) => {
            this.addStepToDOM(step, index === this.stepBuffer.length - 1);
        });

        // Show latest consensus
        if (this.consensusHistory.length > 0) {
            const latest = this.consensusHistory[this.consensusHistory.length - 1];
            this.updateConsensusDisplay(latest.value);
        }

        if (this.statusText) {
            this.statusText.textContent = this.stepBuffer.length > 0 ? 'Processing' : 'Waiting';
        }
    }

    /**
     * Render only the latest buffered step
     */
    renderLatestStep() {
        if (this.stepBuffer.length === 0) {
            return;
        }

        const latestStep = this.stepBuffer[this.stepBuffer.length - 1];
        this.addStepToDOM(latestStep, true);

        if (this.consensusHistory.length > 0) {
            const latest = this.consensusHistory[this.consensusHistory.length - 1];
            this.updateConsensusDisplay(latest.value);
        }
    }

    /**
     * Add step to DOM (used for rendering)
     */
    addStepToDOM(stepData, isActive = false) {
        if (!this.stream) {
            return;
        }

        const stepEl = document.createElement('div');
        stepEl.className = isActive ? 'thinking-step active' : 'thinking-step';

        const timestamp = new Date(stepData.timestamp).toLocaleTimeString();

        stepEl.innerHTML = `
            <div class="step-header">
                <i class="fas fa-${stepData.icon}"></i>
                <span class="step-label">${stepData.label}</span>
                <span style="margin-left: auto; color: #64748b; font-size: 0.75rem;">${timestamp}</span>
            </div>
            <p class="step-text">${stepData.text}</p>
            <div class="step-provider">${stepData.provider}</div>
        `;

        this.stream.appendChild(stepEl);

        // Scroll to bottom if expanded
        if (this.isExpanded) {
            stepEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    updateConsensusDisplay(value) {
        if (this.consensusValue) {
            this.consensusValue.textContent = `${value}%`;
        }
        if (this.consensusFill) {
            this.consensusFill.style.width = `${value}%`;
        }
    }

    /**
     * Connect to real-time Wall-Bounce analysis stream
     * This would be used in production to show actual thinking
     */
    connectToRealStream(sessionId) {
        // Example SSE connection (not implemented in this demo)
        // this.eventSource = new EventSource(`/api/v1/wall-bounce/stream/${sessionId}`);
        //
        // this.eventSource.addEventListener('thinking', (e) => {
        //     const data = JSON.parse(e.data);
        //     this.addStep(data);
        // });
        //
        // this.eventSource.addEventListener('consensus', (e) => {
        //     const data = JSON.parse(e.data);
        //     this.updateConsensus(data.value);
        // });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.thinkingDisplay = new ThinkingProcessDisplay();
});