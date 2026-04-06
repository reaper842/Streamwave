interface Props {
  params: Promise<{ id: string }>
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="px-6 py-8">
      <p className="text-text-secondary">Artist page — ID: {id}</p>
      <p className="mt-2 text-sm text-text-subdued">Content coming in Milestone 4</p>
    </div>
  )
}
