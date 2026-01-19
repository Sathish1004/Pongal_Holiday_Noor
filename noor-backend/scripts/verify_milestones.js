const db = require('../config/db'); // Adjust path to your db config
const { checkAndCompleteMilestones } = require('../utils/milestoneHelper');

// Configuration
const API_URL = 'http://localhost:5000/api'; // Adjust port if needed
const TEST_PROJECT_NAME = 'Milestone Verification Project';

async function runVerification() {
    console.log('🚀 Starting Milestone Verification...');

    let projectId, phaseId, milestoneId, taskId1, taskId2;

    try {
        // 1. Create Test Project (Site)
        console.log('1. Creating Test Project...');
        // We'll perform direct DB insert to speed up or assuming we have an API.
        // Let's use direct DB for setup to avoid auth complexity if possible, 
        // BUT the logic to test is in `siteController.updateTask`.
        // So we MUST use the updateTask API or at least the function.
        // Assuming we can run this script as a standalone usage of the helper + DB.

        // Actually, we want to test the full flow including the controller trigger?
        // Or just the helper? The helper is the core logic.
        // If we verify the helper works, we verify 90% of logic.
        // The controller just calls it.

        // Let's creating a site manually in DB.
        const [siteResult] = await db.query(
            "INSERT INTO sites (name, status, location, city, state, country, client_name, client_phone, client_email, budget, start_date, end_date) VALUES (?, 'Active', 'Test Loc', 'Test City', 'Test State', 'Test Country', 'Test Client', '1234567890', 'test@example.com', 0, NOW(), NOW())",
            [TEST_PROJECT_NAME]
        );
        projectId = siteResult.insertId;
        console.log(`   -> Project Created: ID ${projectId}`);

        // 2. Create Phase
        const [phaseResult] = await db.query("INSERT INTO phases (site_id, name, order_num) VALUES (?, 'Test Phase', 1)", [projectId]);
        phaseId = phaseResult.insertId;
        console.log(`   -> Phase Created: ID ${phaseId}`);

        // 3. Create Milestone Linked to Phase
        // We need to insert into milestones first.
        const [milestoneResult] = await db.query("INSERT INTO milestones (site_id, name, status, planned_start_date, planned_end_date) VALUES (?, 'Test Milestone', 'In Progress', NOW(), NOW())", [projectId]);
        milestoneId = milestoneResult.insertId;
        console.log(`   -> Milestone Created: ID ${milestoneId}`);

        // Link phase to milestone (update phase)
        await db.query("UPDATE phases SET milestone_id = ? WHERE id = ?", [milestoneId, phaseId]);
        console.log(`   -> Phase Linked to Milestone`);

        // 4. Create Tasks in Phase
        const [task1] = await db.query("INSERT INTO tasks (site_id, phase_id, name, status, created_at) VALUES (?, ?, 'Task 1', 'Pending', NOW())", [projectId, phaseId]);
        taskId1 = task1.insertId;
        const [task2] = await db.query("INSERT INTO tasks (site_id, phase_id, name, status, created_at) VALUES (?, ?, 'Task 2', 'Pending', NOW())", [projectId, phaseId]);
        taskId2 = task2.insertId;
        console.log(`   -> Tasks Created: IDs ${taskId1}, ${taskId2}`);

        // 5. Run Helper (Should do nothing yet)
        console.log('5. Running checkAndCompleteMilestones (Expect No Change)...');
        await checkAndCompleteMilestones(projectId);

        let [mCheck] = await db.query("SELECT * FROM milestones WHERE id = ?", [milestoneId]);
        if (mCheck[0].status === 'Completed') throw new Error('Milestone completed prematurely!');
        console.log('   -> Milestone status is correct (In Progress)');

        // 6. Complete Task 1
        console.log('6. Completing Task 1...');
        await db.query("UPDATE tasks SET status = 'Completed', completed_at = NOW() WHERE id = ?", [taskId1]);
        await checkAndCompleteMilestones(projectId);

        [mCheck] = await db.query("SELECT * FROM milestones WHERE id = ?", [milestoneId]);
        if (mCheck[0].status === 'Completed') throw new Error('Milestone completed prematurely after 1 task!');
        console.log('   -> Milestone status is correct (In Progress)');

        // 7. Complete Task 2 (All tasks done now)
        console.log('7. Completing Task 2...');
        await db.query("UPDATE tasks SET status = 'Completed', completed_at = NOW() WHERE id = ?", [taskId2]);
        await checkAndCompleteMilestones(projectId);

        // 8. Verify Completion
        console.log('8. Verifying Milestone Completion...');
        [mCheck] = await db.query("SELECT * FROM milestones WHERE id = ?", [milestoneId]);

        if (mCheck[0].status !== 'Completed') {
            console.error('FAILED: Milestone status is ' + mCheck[0].status);
            throw new Error('Milestone did not auto-complete');
        }
        if (!mCheck[0].actual_completion_date) {
            console.error('FAILED: actual_completion_date is NULL');
            throw new Error('Completion date not set');
        }
        console.log('   -> ✅ Milestone Completed!');
        console.log('   -> ✅ Completion Date Set:', mCheck[0].actual_completion_date);

        // 9. Verify System Message
        console.log('9. Verifying System Message injection...');
        const [msgs] = await db.query("SELECT * FROM stage_messages WHERE phase_id = ? AND type = 'system'", [phaseId]);
        const achievementMsg = msgs.find(m => m.content && m.content.includes('Achievement Unlocked') && m.content.includes('Test Milestone'));

        if (!achievementMsg) {
            console.error('FAILED: System message not found. Msgs:', msgs);
            throw new Error('System message verification failed');
        }
        console.log('   -> ✅ System Message Found:', achievementMsg.content);

        console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
    } finally {
        // Cleanup
        console.log('\nCleaning up test data...');
        if (taskId1) await db.query("DELETE FROM tasks WHERE id IN (?, ?)", [taskId1, taskId2]);
        if (phaseId) {
            await db.query("DELETE FROM stage_messages WHERE phase_id = ?", [phaseId]);
            await db.query("DELETE FROM phases WHERE id = ?", [phaseId]);
        }
        if (milestoneId) await db.query("DELETE FROM milestones WHERE id = ?", [milestoneId]);
        if (projectId) {
            await db.query("DELETE FROM sites WHERE id = ?", [projectId]);
        }
        process.exit();
    }
}

runVerification();
