'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ConfirmDialog from '@/components/ConfirmDialog'
import { addApplicant } from '@/lib/db'
import { POSITION_OPTIONS } from '@/lib/positions'
import './add-applicant.css'

export default function AddApplicantPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  // Form state - each field has its own state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    education: '',
    course: '',
    positionAppliedFor: '',
    collectionExperience: '',
    referral: '',
    resume: null,
    picture: null,
  })

  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'default'
    onConfirm: () => void
  }>({
    open: false,
    title: 'Confirm Action',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  })

  useEffect(() => {
    // Check if user is HR
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }

    const userData = JSON.parse(storedUser)
    if (userData.role !== 'hr') {
      router.push('/')
      return
    }

    setUser(userData)
  }, [router])

  // Handle input field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Handle file selection for resume (PDF)
  const handleResumeChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setFormData({
        ...formData,
        resume: file,
      })
      setMessage('')
    } else {
      setMessage('Please upload a PDF file for resume')
    }
  }

  // Handle file selection for picture (PNG, JPEG)
  const handlePictureChange = (e) => {
    const file = e.target.files?.[0]
    if (file && ['image/png', 'image/jpeg'].includes(file.type)) {
      setFormData({
        ...formData,
        picture: file,
      })
      setMessage('')
    } else {
      setMessage('Please upload a PNG or JPEG image')
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch('/api/uploads', { method: 'POST', body: form })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body?.error || 'Failed to upload file')
    }
    return body.url
  }

  const submitApplicant = () => {
    setIsSubmitting(true)

    // Validation - check all fields are filled
    if (
      !formData.name ||
      !formData.age ||
      !formData.education ||
      !formData.course ||
      !formData.positionAppliedFor ||
      !formData.collectionExperience ||
      !formData.referral ||
      !formData.resume ||
      !formData.picture
    ) {
      setMessage('Please fill all required fields')
      setIsSubmitting(false)
      return
    }

    Promise.all([uploadFile(formData.resume), uploadFile(formData.picture)])
      .then(([resumeUrl, pictureUrl]) => {
        // Create new applicant object
        const newApplicant = {
          id: Date.now(),
          name: formData.name,
          age: formData.age,
          education: formData.education,
          course: formData.course,
          positionAppliedFor: formData.positionAppliedFor,
          collectionExperience: formData.collectionExperience,
          referral: formData.referral,
          resumeFileName: formData.resume.name,
          resumeUrl,
          pictureFileName: formData.picture.name,
          pictureUrl,
          status: 'pending',
          addedDate: new Date().toISOString().split('T')[0],
          addedBy: user.email,
        }

        // Save to IndexedDB
        return addApplicant(newApplicant)
      })
      .then(() => {
        setMessage('✓ Applicant added successfully! Awaiting boss approval.')
        setFormData({
          name: '',
          age: '',
          education: '',
          course: '',
          positionAppliedFor: '',
          collectionExperience: '',
          referral: '',
          resume: null,
          picture: null,
        })

        // Clear form inputs
        const fileInputs = document.querySelectorAll('input[type="file"]')
        fileInputs.forEach((input) => {
          input.value = ''
        })

        setIsSubmitting(false)
      })
      .catch((error) => {
        console.error('Error adding applicant:', error)
        const rawMessage = error instanceof Error ? error.message : ''
        let friendlyMessage = 'Error adding applicant. Please try again.'
        if (rawMessage) {
          try {
            const parsed = JSON.parse(rawMessage)
            if (parsed?.error) friendlyMessage = parsed.error
          } catch {
            friendlyMessage = rawMessage
          }
        }
        setMessage(friendlyMessage)
        setIsSubmitting(false)
      })
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()

    setConfirmState({
      open: true,
      title: 'Add Applicant',
      message: 'Add this applicant now?',
      variant: 'default',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }))
        submitApplicant()
      },
    })
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-container">
      <Sidebar role="hr" userName={user.email} />

      <div className="dashboard-content">
        <h1>Add Applicant</h1>
        <p className="subtitle">
          Add a new applicant's information and resume
        </p>
        <div className="form-container">
          {/* Show message (success or error) */}
          {message && (
            <div
              className={`message ${
                message.includes('successfully')
                  ? 'message-success'
                  : 'message-error'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name field */}
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter applicant name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            {/* Age field */}
            <div className="form-group">
              <label htmlFor="age">Age *</label>
              <input
                id="age"
                type="number"
                name="age"
                placeholder="Enter age"
                value={formData.age}
                onChange={handleInputChange}
              />
            </div>

            {/* Education field - Updated to dropdown */}
            <div className="form-group">
              <label htmlFor="education">Education *</label>
              <select
                id="education"
                name="education"
                value={formData.education}
                onChange={handleInputChange}
                className="education-select"
                required
              >
                <option value="" disabled>Select education level</option>
                <option value="Highschool Undergrad">Highschool Undergrad</option>
                <option value="Highschool Graduate">Highschool Graduate</option>
                <option value="Senior Highschool Undergrad">Senior Highschool Undergrad</option>
                <option value="Senior Highschool Graduate">Senior Highschool Graduate</option>
                <option value="College Undergrad">College Undergrad</option>
                <option value="College Graduate">College Graduate</option>
                <option value="Vocational Undergrad">Vocational Undergrad</option>
                <option value="Vocational Graduate">Vocational Graduate</option>
              </select>
            </div>

            {/* Course field */}
            <div className="form-group">
              <label htmlFor="course">Course *</label>
              <input
                id="course"
                type="text"
                name="course"
                placeholder="e.g. Computer Science"
                value={formData.course}
                onChange={handleInputChange}
              />
            </div>

            {/* Collection Experience field */}
            <div className="form-group">
              <label htmlFor="positionAppliedFor">Position Applied For *</label>
              <select
                id="positionAppliedFor"
                name="positionAppliedFor"
                value={formData.positionAppliedFor}
                onChange={handleInputChange}
                className="position-select"
                required
              >
                <option value="" disabled>Select position</option>
                {POSITION_OPTIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection Experience field */}
            <div className="form-group">
              <label htmlFor="collectionExperience">Collection Experience *</label>
              <input
                id="collectionExperience"
                type="text"
                name="collectionExperience"
                placeholder="e.g. 3 years"
                value={formData.collectionExperience}
                onChange={handleInputChange}
              />
            </div>

            {/* Referral field */}
            <div className="form-group">
              <label htmlFor="referral">Referral *</label>
              <input
                id="referral"
                type="text"
                name="referral"
                placeholder="Referral"
                value={formData.referral}
                onChange={handleInputChange}
              />
            </div>

            {/* Resume upload */}
            <div className="form-group">
              <label htmlFor="resume">Resume (PDF) *</label>
              <input
                id="resume"
                type="file"
                accept=".pdf"
                onChange={handleResumeChange}
              />
              {formData.resume && (
                <p className="file-info">✓ {formData.resume.name}</p>
              )}
            </div>

            {/* Picture upload */}
            <div className="form-group">
              <label htmlFor="picture">Picture (PNG, JPEG) *</label>
              <input
                id="picture"
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handlePictureChange}
              />
              {formData.picture && (
                <p className="file-info">✓ {formData.picture.name}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? 'Adding...' : 'Add Applicant'}
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
