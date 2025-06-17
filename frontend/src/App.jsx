import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Plus, Sparkles, User, Settings } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Local suggestion generator (no API required)
  const generateLocalSuggestions = (taskText) => {
    if (!taskText.trim() || taskText.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    // Simple suggestion logic based on keywords
    const suggestionTemplates = {
      work: ['Schedule focused work session', 'Prepare meeting agenda', 'Review and prioritize tasks'],
      meeting: ['Prepare meeting materials', 'Send calendar invites', 'Create meeting agenda'],
      study: ['Create study schedule', 'Gather learning materials', 'Set study goals'],
      exercise: ['Plan workout routine', 'Schedule gym time', 'Track fitness goals'],
      travel: ['Check travel requirements', 'Book accommodations', 'Create itinerary'],
      shopping: ['Create shopping list', 'Compare prices', 'Set budget'],
      default: ['Break down into smaller tasks', 'Set a deadline', 'Identify required resources']
    };

    const text = taskText.toLowerCase();
    let suggestions = [];

    // Determine category and generate suggestions
    if (text.includes('work') || text.includes('job') || text.includes('office')) {
      suggestions = suggestionTemplates.work;
    } else if (text.includes('meeting') || text.includes('call')) {
      suggestions = suggestionTemplates.meeting;
    } else if (text.includes('study') || text.includes('learn') || text.includes('course')) {
      suggestions = suggestionTemplates.study;
    } else if (text.includes('exercise') || text.includes('gym') || text.includes('fitness')) {
      suggestions = suggestionTemplates.exercise;
    } else if (text.includes('travel') || text.includes('trip') || text.includes('vacation')) {
      suggestions = suggestionTemplates.travel;
    } else if (text.includes('buy') || text.includes('shop') || text.includes('purchase')) {
      suggestions = suggestionTemplates.shopping;
    } else {
      suggestions = suggestionTemplates.default;
    }

    // Simulate API delay for better UX
    setTimeout(() => {
      setSuggestions(suggestions.slice(0, 3));
      setIsLoading(false);
    }, 500);
  };

  // Debounced suggestion generation
  useEffect(() => {
    const timer = setTimeout(() => {
      generateLocalSuggestions(newTask);
    }, 300);

    return () => clearTimeout(timer);
  }, [newTask]);

  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: Date.now(),
        text: newTask,
        completed: false,
        createdAt: new Date(),
        priority: 'medium'
      };
      setTasks([...tasks, task]);
      setNewTask('');
      setSuggestions([]);
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const addSuggestion = (suggestion) => {
    const task = {
      id: Date.now(),
      text: suggestion,
      completed: false,
      createdAt: new Date(),
      priority: 'medium'
    };
    setTasks([...tasks, task]);
    setSuggestions([]);
    setNewTask('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Journey AI Planner</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(task => task.completed).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {tasks.filter(task => !task.completed).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Task Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h2>
          
          <div className="flex gap-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              placeholder="What do you want to accomplish?"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addTask}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* AI Suggestions */}
          {(isLoading || suggestions.length > 0) && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  {isLoading ? 'Generating suggestions...' : 'Smart Suggestions'}
                </span>
              </div>
              
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => addSuggestion(suggestion)}
                      className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 text-sm transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Your Tasks</h2>
          </div>
          
          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks yet. Add one above to get started!</p>
                <p className="text-sm text-gray-400 mt-2">Try typing "work meeting" or "study session" to see smart suggestions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 ${
                        task.completed
                          ? 'text-gray-500 line-through'
                          : 'text-gray-900'
                      }`}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;