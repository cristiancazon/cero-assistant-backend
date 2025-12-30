const { google } = require('googleapis');

const getOAuth2Client = (authTokens) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: authTokens.access_token,
    refresh_token: authTokens.refresh_token,
  });
  return oauth2Client;
};

async function listTasks(authTokens, args) {
  try {
    const auth = getOAuth2Client(authTokens);
    const service = google.tasks({ version: 'v1', auth });

    // First get the default task list
    const taskLists = await service.tasklists.list({ maxResults: 1 });
    const taskListId = taskLists.data.items[0].id;

    const res = await service.tasks.list({
      tasklist: taskListId,
      showCompleted: args.showCompleted || false,
      maxResults: 10,
    });

    const tasks = res.data.items;
    if (!tasks || tasks.length === 0) {
      return 'No hay tareas pendientes.';
    }

    return tasks.map(task => `[${task.status === 'completed' ? 'x' : ' '}] ${task.title}`).join('\n');

  } catch (error) {
    console.error('Error listing tasks:', error);
    throw new Error('No se pudo acceder a las tareas.');
  }
}

async function listTasksJSON(authTokens, args = {}) {
  try {
    const auth = getOAuth2Client(authTokens);
    const service = google.tasks({ version: 'v1', auth });

    // First get the default task list
    const taskLists = await service.tasklists.list({ maxResults: 1 });
    if (!taskLists.data.items || taskLists.data.items.length === 0) {
      return [];
    }
    const taskListId = taskLists.data.items[0].id;

    const res = await service.tasks.list({
      tasklist: taskListId,
      showCompleted: args.showCompleted || true, // Show all for dashboard usually
      maxResults: 20,
    });

    return res.data.items || [];

  } catch (error) {
    console.error('Error listing tasks JSON:', error);
    return [];
  }
}

async function completeTask(authTokens, args) {
  try {
    const auth = getOAuth2Client(authTokens);
    const service = google.tasks({ version: 'v1', auth });

    // Get default task list
    const taskLists = await service.tasklists.list({ maxResults: 1 });
    const taskListId = taskLists.data.items[0].id;

    // Find the task by title (rough approximation since we don't have ID from voice easily)
    // In a real app, we might handle this differently, e.g., asking "which one?"
    const allTasks = await service.tasks.list({
        tasklist: taskListId,
        showCompleted: false,
    });
    
    const taskToComplete = allTasks.data.items.find(t => 
        t.title.toLowerCase().includes(args.taskTitle.toLowerCase())
    );

    if (!taskToComplete) {
      return `No encontré una tarea que coincida con "${args.taskTitle}".`;
    }

    await service.tasks.update({
      tasklist: taskListId,
      task: taskToComplete.id,
      resource: {
        id: taskToComplete.id,
        status: 'completed',
      },
    });

    return `Tarea "${taskToComplete.title}" marcada como completada.`;

  } catch (error) {
    console.error('Error completing task:', error);
    throw new Error('No se pudo completar la tarea.');
  }
}

module.exports = {
  listTasks,
  listTasksJSON,
  completeTask,
};
