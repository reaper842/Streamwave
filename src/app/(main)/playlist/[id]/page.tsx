interface Props {
  params: Promise<{ id: string }>
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="px-6 py-8">
      <p className="text-text-secondary">Playlist page — ID: {id}</p>
      <p className="mt-2 text-sm text-text-subdued">Content coming in Milestone 5</p>
    </div>
  )
}
