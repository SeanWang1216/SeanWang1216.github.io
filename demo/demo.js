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
        let selectedRow = '';
        let selectedColumn = '';
        outerNav.style.display = 'none';
        const nav = document.createElement('div');
        nav.className = 'flow-nav instruction-flow-nav';
        nav.innerHTML = '<button type="button" class="secondary">Back</button><button type="button">Next</button>';
        stage.querySelector('.instruction-progress').after(nav);
        const back = nav.querySelector('.secondary');
        const next = nav.querySelector('button:not(.secondary)');
        const note = document.createElement('p');
        note.className = 'instruction-nav-note';
        nav.after(note);

        function render() {
            steps.forEach((step, index) => step.classList.toggle('instruction-section-hidden', index !== currentStep));
            const progress = stage.querySelector('.instruction-progress-label');
            if (progress) {
                progress.textContent = `Section ${currentStep + 1} of ${steps.length}`;
            }
            back.classList.toggle('instruction-nav-hidden', currentStep === 0);
            next.textContent = currentStep === steps.length - 1 ? 'Continue' : 'Next';
            note.textContent = '';
            const stepId = steps[currentStep].id.replace(`${stageId === 'aggregated-instructions' ? 'agg' : 'dec'}-`, '');
            if (stepId === 'section-action-selection' && !selectedRow) {
                note.textContent = 'Click Top or Bottom in A\'s example to continue.';
            } else if (stepId === 'section-b-action-selection' && !selectedColumn) {
                note.textContent = 'Click Left or Right in B\'s example to continue.';
            } else if (stepId === 'section-payoff-calculation' && !(selectedRow && selectedColumn)) {
                note.textContent = 'Choose one row and one column before continuing.';
            }
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
                const target = steps.findIndex((step, index) =>
                    index > currentStep && !step.id.includes('section-table-')
                );
                if (target >= 0) {
                    currentStep = target;
                    render();
                }
            });
        }
        next.addEventListener('click', () => {
            const stepId = steps[currentStep].id.replace(`${stageId === 'aggregated-instructions' ? 'agg' : 'dec'}-`, '');
            if (stepId === 'section-action-selection' && !selectedRow) return;
            if (stepId === 'section-b-action-selection' && !selectedColumn) return;
            if (stepId === 'section-payoff-calculation' && !(selectedRow && selectedColumn)) return;
            if (currentStep < steps.length - 1) {
                currentStep += 1;
                render();
            } else {
                showStage(nextStage);
            }
        });
        stage.querySelectorAll('.player-a-click-cell, .intro-a-row-click, .combined-row').forEach((cell) => {
            cell.addEventListener('click', () => {
                selectedRow = selectedRow === cell.dataset.action ? '' : cell.dataset.action;
                stage.querySelectorAll('[data-row]').forEach((item) => {
                    if (item.closest('.instruction-step') === steps[currentStep] ||
                        item.closest('.instruction-step')?.id.includes('action-selection') ||
                        item.closest('.instruction-step')?.id.includes('payoff-calculation')) {
                        item.classList.toggle('is-selected', Boolean(selectedRow) && item.dataset.row === selectedRow);
                    }
                });
                updateInstructionExamples(stage, selectedRow, selectedColumn);
                render();
            });
        });
        stage.querySelectorAll('.player-b-click-cell, .intro-b-column-click, .combined-column').forEach((cell) => {
            cell.addEventListener('click', () => {
                selectedColumn = selectedColumn === cell.dataset.action ? '' : cell.dataset.action;
                stage.querySelectorAll('[data-col]').forEach((item) => {
                    if (item.closest('.instruction-step') === steps[currentStep] ||
                        item.closest('.instruction-step')?.id.includes('action-selection') ||
                        item.closest('.instruction-step')?.id.includes('payoff-calculation')) {
                        item.classList.toggle('is-selected', Boolean(selectedColumn) && item.dataset.col === selectedColumn);
                    }
                });
                updateInstructionExamples(stage, selectedRow, selectedColumn);
                render();
            });
        });
        render();
    }

    function updateInstructionExamples(stage, row, column) {
        stage.querySelectorAll('td[data-row][data-col]').forEach((cell) => {
            const selected = (row && cell.dataset.row === row) || (column && cell.dataset.col === column);
            const outcome = row && column && cell.dataset.row === row && cell.dataset.col === column;
            cell.classList.toggle('is-selected', Boolean(selected));
            cell.classList.toggle('realized-outcome', Boolean(outcome));
        });
        const results = stage.querySelectorAll('.example-results');
        results.forEach((result) => {
            if (row && column) {
                result.textContent = `A selected ${row}; B selected ${column}. The selected outcome is highlighted.`;
            } else if (row) {
                result.textContent = `A selected ${row}. Now choose B's column.`;
            } else if (column) {
                result.textContent = `B selected ${column}. Now choose A's row.`;
            }
        });
    }

    function answer(form, answers, feedback, nextStage, firstPageCount, messages) {
        let page = 0;
        let attempts = 0;
        const fieldsets = Array.from(form.querySelectorAll('fieldset'));
        const submit = form.querySelector('button[type="submit"]');
        function render() {
            fieldsets.forEach((fieldset, index) => {
                const visible = page === 0
                    ? index < firstPageCount
                    : index >= firstPageCount;
                fieldset.hidden = !visible;
            });
            submit.textContent = page === 0 ? 'Next' : 'Submit answers';
            feedback.classList.remove('show');
        }
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const values = Object.fromEntries(new FormData(form).entries());
            const keys = page === 0 ? Object.keys(answers).slice(0, firstPageCount) : Object.keys(answers).slice(firstPageCount);
            const incorrect = keys.filter((key) => values[key] !== answers[key]);
            if (incorrect.length) {
                attempts += 1;
                const details = incorrect.map((key) => messages[key]).join(' ');
                feedback.textContent = `Please review the following instructions: ${details} Warning: You have used ${attempts} of 3 allowed attempts.`;
                feedback.classList.add('show');
                return;
            }
            if (page === 0) {
                page = 1;
                render();
                return;
            }
            feedback.textContent = 'All answers are correct. You may continue.';
            feedback.classList.add('show');
            submit.textContent = 'Continue';
            submit.onclick = null;
            submit.addEventListener('click', () => showStage(nextStage), { once: true });
        });
        render();
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
        2,
        {
            a1: 'A chooses between Top and Bottom.',
            b1: 'B chooses between Left and Right.',
            p1: 'For Top and Right, the selected payoff is (8, 14) in the top right cell.',
        },
    );
    answer(
        document.getElementById('decomposed-quiz'),
        { a2: 'top_top', b2: 'left_left', p2: '8_14', q2: '11_12', r2: 'a_9_5_b_13' },
        document.getElementById('dec-feedback'),
        'decomposed-game',
        2,
        {
            a2: 'A chooses one row and the same choice applies to both tables.',
            b2: 'B chooses one column and the same choice applies to both tables.',
            p2: 'For Top and Right, the selected payoff in Table 1 is (8, 14).',
            q2: 'For Top and Right, the selected payoff in Table 2 is (11, 12).',
            r2: 'Task payoffs are the sums: A is 8+11=19 and B is 14+12=26.',
        },
    );

    setupGame('aggregated-game', 'agg-submit', 'agg-selection', aggregatedPayoffs, 'decomposed-instructions');
    setupGame('decomposed-game', 'dec-submit', 'dec-selection', decomposedPayoffs, 'finished');

    document.getElementById('restart-demo').addEventListener('click', () => window.location.reload());

})();
