(function () {
    'use strict';

    const stages = Array.from(document.querySelectorAll('.stage'));
    const role = Math.random() < 0.5 ? 'A' : 'B';
    const opponentAction = role === 'A' ? 'Right' : 'Bottom';
    let currentStage = 'welcome';

    const aggregatedPayoffs = {
        'Top|Left': [96, 60],
        'Top|Right': [72, 120],
        'Bottom|Left': [60, 84],
        'Bottom|Right': [84, 96],
    };

    const decomposedPayoffs = {
        component1: {
            'Top|Left': [72, 60],
            'Top|Right': [72, 96],
            'Bottom|Left': [60, 60],
            'Bottom|Right': [60, 96],
        },
        component2: {
            'Top|Left': [24, 0],
            'Top|Right': [0, 24],
            'Bottom|Left': [0, 24],
            'Bottom|Right': [24, 0],
        },
    };

    function showStage(id) {
        currentStage = id;
        stages.forEach((stage) => stage.classList.toggle('active', stage.id === id));
        document.body.classList.toggle('experiment-mode', id !== 'welcome');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setupInstructions(stageId, nextStage) {
        const stage = document.getElementById(stageId);
        const steps = Array.from(stage.querySelectorAll('.instruction-step'));
        const outerNav = stage.querySelector('.flow-nav');
        let currentStep = 0;
        outerNav.style.display = 'none';
        const nav = document.createElement('div');
        nav.className = 'flow-nav instruction-flow-nav';
        nav.innerHTML = '<button type="button" class="secondary">Back</button><button type="button">Next</button>';
        stage.querySelector('.instruction-progress').after(nav);
        const back = nav.querySelector('.secondary');
        const next = nav.querySelector('button:not(.secondary)');

        function render() {
            steps.forEach((step, index) => step.classList.toggle('instruction-section-hidden', index !== currentStep));
            const progress = stage.querySelector('.instruction-progress-label');
            if (progress) {
                progress.textContent = `Section ${currentStep + 1} of ${steps.length}`;
            }
            back.disabled = currentStep === 0;
            next.textContent = currentStep === steps.length - 1 ? 'Continue' : 'Next';
        }

        back.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep -= 1;
                render();
            }
        });
        const skip = stage.querySelector('.skip-table-sections button');
        if (skip) {
            skip.addEventListener('click', () => {
                const target = steps.findIndex((step) => step.id.endsWith('section-action-selection'));
                if (target >= 0) {
                    currentStep = target;
                    render();
                }
            });
        }
        next.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep += 1;
                render();
            } else {
                showStage(nextStage);
            }
        });
        render();
    }

    function answer(form, answers, feedback, nextStage) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form).entries());
            const incorrect = Object.keys(answers).filter((key) => values[key] !== answers[key]);
            if (incorrect.length) {
                feedback.textContent = 'Please review the instructions and try again. All questions must be answered correctly before proceeding.';
                feedback.classList.add('show');
                return;
            }
            feedback.textContent = 'All answers are correct. You may continue.';
            feedback.classList.add('show');
            form.querySelector('button[type="submit"]').textContent = 'Continue';
            form.querySelector('button[type="submit"]').onclick = () => showStage(nextStage);
        });
    }

    function setupGame(stageId, submitId, selectionId, matrices, nextStage) {
        let selected = '';
        const stage = document.getElementById(stageId);
        const status = document.getElementById(selectionId);
        const submit = document.getElementById(submitId);
        const selectable = stage.querySelectorAll('.choice-row, .choice-col');

        selectable.forEach((choice) => {
            choice.addEventListener('click', () => {
                const action = choice.dataset.action;
                if ((role === 'A' && choice.classList.contains('choice-col')) ||
                    (role === 'B' && choice.classList.contains('choice-row'))) {
                    return;
                }
                selected = selected === action ? '' : action;
                stage.querySelectorAll('.choice-row, .choice-col').forEach((cell) => {
                    cell.classList.toggle('selected', cell.dataset.action === selected);
                });
                stage.querySelectorAll('td[data-row][data-col]').forEach((cell) => {
                    const rowMatch = role === 'A' && cell.dataset.row === selected;
                    const colMatch = role === 'B' && cell.dataset.col === selected;
                    cell.classList.toggle('selected', Boolean(selected && (rowMatch || colMatch)));
                });
                status.textContent = selected ? `Selected action: ${selected}` : 'No action selected.';
            });
        });

        submit.addEventListener('click', () => {
            if (!selected) {
                status.textContent = 'Please select your action in the payoff matrix before continuing.';
                return;
            }
            showStage(nextStage);
        });

        stage.querySelectorAll('.game-matrix').forEach((matrix) => {
            matrix.querySelectorAll('td[data-row][data-col]').forEach((cell) => {
                const key = `${cell.dataset.row}|${cell.dataset.col}`;
                const payoff = matrices[cell.closest('.game-panel').querySelector('h3').textContent.includes('Component 2') ? 'component2' : 'component1']?.[key]
                    || matrices[key];
                if (payoff) {
                    cell.setAttribute('aria-label', `Payoff pair ${payoff[0]}, ${payoff[1]}`);
                }
            });
        });
    }

    document.getElementById('start-demo').addEventListener('click', () => {
        document.getElementById('agg-role').textContent = `You are Player ${role}. The simulated opponent is Player ${role === 'A' ? 'B' : 'A'}.`;
        document.getElementById('agg-opponent-label').textContent = opponentAction;
        document.getElementById('agg-simulated-choice').textContent = `Simulated choice: ${opponentAction}.`;
        document.getElementById('dec-role').textContent = `You are Player ${role}. The same role is used in both rounds.`;
        document.getElementById('dec-opponent-label').textContent = opponentAction;
        showStage('aggregated-instructions');
    });

    document.querySelectorAll('[data-back]').forEach((button) => {
        button.addEventListener('click', () => showStage(button.dataset.back));
    });

    setupInstructions('aggregated-instructions', 'agg-quiz');
    setupInstructions('decomposed-instructions', 'dec-quiz');

    answer(
        document.getElementById('aggregated-quiz'),
        { a1: 'top_bottom', b1: 'left_right', p1: '8_14' },
        document.getElementById('agg-feedback'),
        'aggregated-game',
    );
    answer(
        document.getElementById('decomposed-quiz'),
        { a2: 'top_top', b2: 'left_left', p2: '8_14', q2: '11_12', r2: 'a_9_5_b_13' },
        document.getElementById('dec-feedback'),
        'decomposed-game',
    );

    setupGame('aggregated-game', 'agg-submit', 'agg-selection', aggregatedPayoffs, 'decomposed-instructions');
    setupGame('decomposed-game', 'dec-submit', 'dec-selection', decomposedPayoffs, 'finished');

    document.getElementById('restart-demo').addEventListener('click', () => window.location.reload());

    document.querySelectorAll('.interactive-selector').forEach((cell) => {
        cell.addEventListener('click', () => {
            const action = cell.dataset.action;
            const table = cell.closest('table');
            table.querySelectorAll('.interactive-selector').forEach((item) => {
                item.classList.toggle('is-selected', item.dataset.action === action);
            });
            table.querySelectorAll('td[data-row], td[data-col]').forEach((item) => {
                item.classList.toggle('is-selected', item.dataset.row === action || item.dataset.col === action);
            });
        });
    });
})();
