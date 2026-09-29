export default function HistoireCagnotte({ description }) {
  if (!description?.trim()) {
    return <p className="text-[17px] text-muted-foreground">L'organisateur n'a pas encore raconté l'histoire de cette cagnotte.</p>;
  }
  return <p className="whitespace-pre-line text-[19px] leading-[1.7] text-[#45524F]">{description}</p>;
}
