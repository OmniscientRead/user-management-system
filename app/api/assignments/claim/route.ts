import { NextRequest, NextResponse } from 'next/server'
import { readStore, writeStore } from '@/lib/server/data-store'
import {
  isUsingMySql,
  getApplicants,
  getUsers,
  getAssignments,
  getManpowerRequests,
  updateApplicant,
  createAssignment,
} from '@/lib/server/mysql-store'

export const runtime = 'nodejs'

function nextId(items: any[]): number {
  if (!Array.isArray(items) || items.length === 0) return 1
  return Math.max(...items.map((item) => Number(item?.id) || 0)) + 1
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const applicantId = Number(body?.applicantId)
    const tlEmail = String(body?.tlEmail || '').trim()
    const assignedBy = String(body?.assignedBy || '').trim()

    if (!Number.isFinite(applicantId) || !tlEmail || !assignedBy) {
      return NextResponse.json({ error: 'applicantId, tlEmail and assignedBy are required' }, { status: 400 })
    }

    if (isUsingMySql()) {
      const [applicants, users, assignments, manpowerRequests] = await Promise.all([
        getApplicants(),
        getUsers(),
        getAssignments(),
        getManpowerRequests(),
      ])

      const applicant = applicants.find((item: any) => Number(item?.id) === applicantId)
      if (!applicant) {
        return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
      }

      const tlUser = users.find((item: any) => item.email === tlEmail && item.role === 'team-lead')
      if (!tlUser) {
        return NextResponse.json({ error: 'Team Leader not found' }, { status: 404 })
      }

      const applicantPosition = String(applicant.positionAppliedFor || '').trim()
      if (!applicantPosition) {
        return NextResponse.json({ error: 'Applicant has no position applied field' }, { status: 409 })
      }

      const alreadyAssigned = assignments.some(
        (item: any) =>
          Number(item?.applicantId) === applicantId &&
          (item?.status === 'active' || item?.status === undefined)
      )

      if (alreadyAssigned || applicant.status === 'assigned' || applicant.assignedUserId) {
        return NextResponse.json({ error: 'Applicant is already assigned' }, { status: 409 })
      }

      if (applicant.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved applicants can be assigned' }, { status: 409 })
      }

      const matchingRequests = manpowerRequests
        .filter(
          (item: any) =>
            item.teamLeadEmail === tlEmail &&
            item.position === applicantPosition &&
            item.status === 'approved' &&
            item.limit !== null &&
            item.limit !== undefined
        )
        .sort((a: any, b: any) => (Number(b?.id) || 0) - (Number(a?.id) || 0))

      if (matchingRequests.length === 0) {
        return NextResponse.json(
          { error: `No approved manpower request found for ${applicantPosition}` },
          { status: 409 }
        )
      }

      const manpowerRequest = matchingRequests[0]
      const totalLimit = matchingRequests.reduce(
        (sum: number, item: any) => sum + Number(item?.limit || 0),
        0
      )

      const currentAssigned = assignments.filter((item: any) => {
        const isActive = (item?.status || 'active') === 'active'
        if (!isActive) return false
        return (
          item?.tlEmail === tlEmail &&
          String(item?.positionAppliedFor || '') === applicantPosition
        )
      }).length

      if (currentAssigned >= totalLimit) {
        return NextResponse.json(
          { error: `Manpower limit reached for ${applicantPosition}` },
          { status: 409 }
        )
      }

      const updatedApplicant = {
        ...applicant,
        status: 'assigned',
        assignedUserId: tlUser.id,
        assignedTL: tlEmail,
        assignedTLName: tlEmail.split('@')[0],
        assignedDate: new Date().toISOString(),
      }

      const assignment = await createAssignment({
        applicantId: applicant.id,
        applicantName: applicant.name,
        age: applicant.age,
        education: applicant.education,
        course: applicant.course,
        positionAppliedFor: applicant.positionAppliedFor || '',
        collectionExperience: applicant.collectionExperience,
        referral: applicant.referral,
        pictureData: applicant.pictureData,
        resumeData: applicant.resumeData,
        tlEmail,
        tlName: tlEmail.split('@')[0],
        requestId: manpowerRequest.id,
        assignedBy,
        assignedDate: new Date().toISOString(),
        status: 'active',
      })

      await updateApplicant(applicant.id, updatedApplicant)

      return NextResponse.json({ assignment, applicant: updatedApplicant })
    }

    const store = await readStore()
    const applicant = store.applicants.find((item: any) => Number(item?.id) === applicantId)
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    }

    const tlUser = store.users.find((item: any) => item.email === tlEmail && item.role === 'team-lead')
    if (!tlUser) {
      return NextResponse.json({ error: 'Team Leader not found' }, { status: 404 })
    }

    const applicantPosition = String(applicant.positionAppliedFor || '').trim()
    if (!applicantPosition) {
      return NextResponse.json({ error: 'Applicant has no position applied field' }, { status: 409 })
    }

    const alreadyAssigned = store.assignments.some(
      (item: any) =>
        Number(item?.applicantId) === applicantId &&
        (item?.status === 'active' || item?.status === undefined)
    )

    if (alreadyAssigned || applicant.status === 'assigned' || applicant.assignedUserId) {
      return NextResponse.json({ error: 'Applicant is already assigned' }, { status: 409 })
    }

    if (applicant.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved applicants can be assigned' }, { status: 409 })
    }

    const matchingRequests = store.manpowerRequests
      .filter(
        (item: any) =>
          item.teamLeadEmail === tlEmail &&
          item.position === applicantPosition &&
          item.status === 'approved' &&
          item.limit !== null &&
          item.limit !== undefined
      )
      .sort((a: any, b: any) => (Number(b?.id) || 0) - (Number(a?.id) || 0))

    if (matchingRequests.length === 0) {
      return NextResponse.json(
        { error: `No approved manpower request found for ${applicantPosition}` },
        { status: 409 }
      )
    }

    const manpowerRequest = matchingRequests[0]
    const totalLimit = matchingRequests.reduce(
      (sum: number, item: any) => sum + Number(item?.limit || 0),
      0
    )

    const currentAssigned = store.assignments.filter((item: any) => {
      const isActive = (item?.status || 'active') === 'active'
      if (!isActive) return false
      return (
        item?.tlEmail === tlEmail &&
        String(item?.positionAppliedFor || '') === applicantPosition
      )
    }).length

    if (currentAssigned >= totalLimit) {
      return NextResponse.json(
        { error: `Manpower limit reached for ${applicantPosition}` },
        { status: 409 }
      )
    }

    applicant.status = 'assigned'
    applicant.assignedUserId = tlUser.id
    applicant.assignedTL = tlEmail
    applicant.assignedTLName = tlEmail.split('@')[0]
    applicant.assignedDate = new Date().toISOString()

    const assignment = {
      id: nextId(store.assignments),
      applicantId: applicant.id,
      applicantName: applicant.name,
      age: applicant.age,
      education: applicant.education,
      course: applicant.course,
      positionAppliedFor: applicant.positionAppliedFor || '',
      collectionExperience: applicant.collectionExperience,
      referral: applicant.referral,
      pictureData: applicant.pictureData,
      resumeData: applicant.resumeData,
      tlEmail,
      tlName: tlEmail.split('@')[0],
      requestId: manpowerRequest.id,
      assignedBy,
      assignedDate: new Date().toISOString(),
      status: 'active',
    }

    manpowerRequest.assignedCount = currentAssigned + 1
    store.assignments.push(assignment)
    await writeStore(store)

    return NextResponse.json({ assignment, applicant })
  } catch (error) {
    console.error('POST /api/assignments/claim error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
