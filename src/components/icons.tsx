import { MdSubtitles } from 'react-icons/md';

type IconProps = {
  className?: string;
};

export const SubtitlesIcon = ({ className }: IconProps) => {
  return <MdSubtitles className={className} />;
};
