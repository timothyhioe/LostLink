import { useState } from 'react'
import './itemPostForm.css'

interface ItemPostFormProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  onPostSuccess?: () => void
}

const API_BASE_URL = 'http://localhost:5000/api'

export default function ItemPostForm({ isOpen, onClose, isDarkMode, onPostSuccess }: ItemPostFormProps) {
  const [formData, setFormData] = useState({
    type: 'found',
    title: '',
    description: '',
    location: '',
    buildingName: '',
    tags: '',
    coordinates: [0, 0] // Default coordinates
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Please enter a title')
      return
    }
    if (!formData.description.trim()) {
      setError('Please enter a description')
      return
    }
    if (!formData.buildingName.trim()) {
      setError('Please enter a building name')
      return
    }

    try {
      setIsSubmitting(true)

      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken')
      if (!authToken) {
        setError('Authentication token not found. Please log in again.')
        return
      }

      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // Prepare payload
      const payload = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        buildingName: formData.buildingName,
        tags: tagsArray.length > 0 ? tagsArray.join(',') : ''
      }

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to post item')
      }

      setSuccess(true)
      setFormData({
        type: 'found',
        title: '',
        description: '',
        location: '',
        buildingName: '',
        tags: '',
        coordinates: [0, 0]
      })

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose()
        if (onPostSuccess) {
          onPostSuccess()
        }
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error posting item:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`item-post-form-overlay ${isDarkMode ? 'dark-mode' : 'light-mode'}`} onClick={onClose}>
      <div className="item-post-form-container" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="item-post-form-close" onClick={onClose}>&times;</button>

        {/* Success message */}
        {success && (
          <div className="item-post-form-success">
            ✓ Item posted successfully!
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="item-post-form-error">
            {error}
          </div>
        )}

        <h2 className="item-post-form-title">Post an Item</h2>

        <form onSubmit={handleSubmit} className="item-post-form">
          {/* Type selection */}
          <div className="item-post-form-group">
            <label htmlFor="type">Item Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="item-post-form-input"
              required
            >
              <option value="found">Found</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Title */}
          <div className="item-post-form-group">
            <label htmlFor="title">Item Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="e.g., Water Bottle"
              value={formData.title}
              onChange={handleInputChange}
              className="item-post-form-input"
              required
            />
          </div>

          {/* Description */}
          <div className="item-post-form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the item in detail..."
              value={formData.description}
              onChange={handleInputChange}
              className="item-post-form-textarea"
              rows={4}
              required
            />
          </div>

          {/* Building Name */}
          <div className="item-post-form-group">
            <label htmlFor="buildingName">Location / Building Name *</label>
            <input
              id="buildingName"
              type="text"
              name="buildingName"
              placeholder="e.g., D14, Library, Student Center"
              value={formData.buildingName}
              onChange={handleInputChange}
              className="item-post-form-input"
              required
            />
          </div>

          {/* Tags */}
          <div className="item-post-form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              id="tags"
              type="text"
              name="tags"
              placeholder="e.g., bottle, black, metal"
              value={formData.tags}
              onChange={handleInputChange}
              className="item-post-form-input"
            />
          </div>

          {/* Submit button */}
          <div className="item-post-form-buttons">
            <button
              type="submit"
              className="item-post-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post Item'}
            </button>
            <button
              type="button"
              className="item-post-form-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="item-post-form-note">
          * Required fields. Your user ID will be automatically set as the founder.
        </p>
      </div>
    </div>
  )
}
