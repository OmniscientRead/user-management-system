type Entity = 'users' | 'applicants' | 'assignments' | 'manpowerRequests' | 'settings'

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function getEntity<T>(entity: Entity): Promise<T> {
  const response = await fetch(`/api/data/${entity}`, {
    method: 'GET',
    cache: 'no-store',
  })
  return parseResponse<T>(response)
}

async function postEntity<T>(entity: Exclude<Entity, 'settings'>, payload: any): Promise<T> {
  const response = await fetch(`/api/data/${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response)
}

async function putEntity<T>(entity: Entity, payload: any): Promise<T> {
  const response = await fetch(`/api/data/${entity}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<T>(response)
}

async function deleteEntity(entity: Exclude<Entity, 'settings'>, id: number): Promise<void> {
  const response = await fetch(`/api/data/${entity}?id=${id}`, {
    method: 'DELETE',
  })
  await parseResponse(response)
}

export const api = {
  getEntity,
  postEntity,
  putEntity,
  deleteEntity,
  claimAssignment: async (payload: { applicantId: number; tlEmail: string; assignedBy: string }) => {
    const response = await fetch('/api/assignments/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse(response)
  },
}
