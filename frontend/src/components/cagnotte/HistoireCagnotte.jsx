import { useTranslation } from 'react-i18next';

export default function HistoireCagnotte({ description }) {
  const { t } = useTranslation('cagnotte');
  if (!description?.trim()) {
    return <p className="text-[17px] text-muted-foreground">{t('page.sansHistoire')}</p>;
  }
  return <p className="whitespace-pre-line text-[19px] leading-[1.7] text-[#45524F]">{description}</p>;
}
