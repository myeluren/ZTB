import { useState, useEffect } from 'react'

interface Task {
  id: number
  task_name: string
  file_name: string
  status: string
  progress: number
  completed_sections: number
  total_sections: number
  current_section: string
  created_at: string
  updated_at: string
  completed_at: string
  file_url: string
  error_message: string
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // 加载任务列表
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTasks(result.tasks)
        }
      }
    } catch (error) {
      console.error('加载任务列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新任务状态
  const refreshTaskStatus = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTasks(tasks.map(t => t.id === taskId ? result.task : t))
        }
      }
    } catch (error) {
      console.error('刷新任务状态失败:', error)
    }
  }

  // 暂停任务
  const pauseTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/pause`, {
        method: 'POST'
      })
      if (response.ok) {
        await refreshTaskStatus(taskId)
      }
    } catch (error) {
      console.error('暂停任务失败:', error)
      alert('暂停任务失败')
    }
  }

  // 继续任务
  const resumeTask = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/resume`, {
        method: 'POST'
      })
      if (response.ok) {
        await refreshTaskStatus(taskId)
      }
    } catch (error) {
      console.error('继续任务失败:', error)
      alert('继续任务失败')
    }
  }

  // 删除任务
  const deleteTask = async (taskId: number) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId))
      }
    } catch (error) {
      console.error('删除任务失败:', error)
      alert('删除任务失败')
    }
  }

  // 下载文件
  const downloadFile = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && task.file_url) {
      window.open(task.file_url, '_blank')
    }
  }

  // 获取状态显示
  const getStatusDisplay = (task: Task) => {
    switch (task.status) {
      case 'pending':
        return { text: '待开始', color: '#9ca3af', icon: '⏳' }
      case 'running':
        return { text: '进行中', color: '#0052D9', icon: '⚙️' }
      case 'paused':
        return { text: '已暂停', color: '#ed7b2f', icon: '⏸️' }
      case 'completed':
        return { text: '已完成', color: '#00a870', icon: '✅' }
      case 'failed':
        return { text: '失败', color: '#d54941', icon: '❌' }
      default:
        return { text: '未知', color: '#9ca3af', icon: '❓' }
    }
  }

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-'
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN')
  }

  useEffect(() => {
    loadTasks()

    // 每5秒刷新一次任务列表
    const interval = setInterval(() => {
      if (tasks.some(t => t.status === 'running')) {
        loadTasks()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="task-list-loading">加载中...</div>
  }

  return (
    <div className="task-list-container">
      <div className="task-list-header">
        <h2 className="task-list-title">生成任务列表</h2>
        <button className="refresh-button" onClick={loadTasks}>
          🔄 刷新
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="task-list-empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">暂无任务</div>
          <div className="empty-hint">在"生成文件"页面创建新任务</div>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => {
            const status = getStatusDisplay(task)
            return (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <div className="task-name">{task.task_name}</div>
                  <div className="task-status" style={{ color: status.color }}>
                    {status.icon} {status.text}
                  </div>
                </div>

                <div className="task-info">
                  {task.file_name && (
                    <div className="task-info-item">
                      <span className="info-label">文件:</span>
                      <span className="info-value">{task.file_name}</span>
                    </div>
                  )}
                  <div className="task-info-item">
                    <span className="info-label">创建时间:</span>
                    <span className="info-value">{formatTime(task.created_at)}</span>
                  </div>
                  {task.completed_at && (
                    <div className="task-info-item">
                      <span className="info-label">完成时间:</span>
                      <span className="info-value">{formatTime(task.completed_at)}</span>
                    </div>
                  )}
                </div>

                {task.status === 'running' && (
                  <div className="task-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="progress-text">
                      {task.progress}% ({task.completed_sections}/{task.total_sections} 章节)
                    </div>
                    {task.current_section && (
                      <div className="current-section">
                        当前章节: {task.current_section}
                      </div>
                    )}
                  </div>
                )}

                {task.status === 'failed' && task.error_message && (
                  <div className="task-error">
                    错误: {task.error_message}
                  </div>
                )}

                <div className="task-actions">
                  {task.status === 'running' && (
                    <button
                      className="action-button pause-button"
                      onClick={() => pauseTask(task.id)}
                    >
                      ⏸️ 暂停
                    </button>
                  )}
                  {task.status === 'paused' && (
                    <button
                      className="action-button resume-button"
                      onClick={() => resumeTask(task.id)}
                    >
                      ▶️ 继续
                    </button>
                  )}
                  {task.status === 'completed' && task.file_url && (
                    <button
                      className="action-button download-button"
                      onClick={() => downloadFile(task.id)}
                    >
                      📥 下载
                    </button>
                  )}
                  {task.status === 'failed' && (
                    <button
                      className="action-button retry-button"
                      onClick={() => resumeTask(task.id)}
                    >
                      🔄 重试
                    </button>
                  )}
                  <button
                    className="action-button delete-button"
                    onClick={() => deleteTask(task.id)}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
