import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import {
  MdBrokenImage,
  MdCheck,
  MdChevronLeft,
  MdChevronRight,
  MdFilterList,
  MdOutlineFiberNew,
  MdPlayCircleFilled,
  MdSubtitles,
  MdUpgrade,
} from 'react-icons/md';
import { PiFilmReelFill } from 'react-icons/pi';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
};

export const CheckIcon = ({ className }: IconProps) => {
  return <MdCheck className={className} />;
};

export const SubtitlesIcon = ({ className }: IconProps) => {
  return <MdSubtitles className={className} />;
};

export const UpgradeIcon = ({ className }: IconProps) => {
  return <MdUpgrade className={className} />;
};

export const PlexIcon = ({ className }: IconProps) => {
  return (
    <img
      src={new URL('../assets/plex.svg', import.meta.url).href}
      alt="Plex"
      className={className}
    />
  );
};

export const FilterIcon = ({ className, onClick }: IconProps) => (
  <MdFilterList className={className} onClick={onClick} />
);

export const ChevronLeftIcon = ({ className, onClick }: IconProps) => (
  <MdChevronLeft className={className} onClick={onClick} />
);

export const ChevronRightIcon = ({ className, onClick }: IconProps) => (
  <MdChevronRight className={className} onClick={onClick} />
);

export const SortAscIcon = ({ className, style, onClick }: IconProps) => (
  <FaSortAmountUp className={className} style={style} onClick={onClick} />
);

export const SortDescIcon = ({ className, style, onClick }: IconProps) => (
  <FaSortAmountDown className={className} style={style} onClick={onClick} />
);

export const FilmReelIcon = ({ className, style }: IconProps) => (
  <PiFilmReelFill className={className} style={style} />
);

export const PlayIcon = ({ className, style }: IconProps) => (
  <MdPlayCircleFilled className={className} style={style} />
);

export const NewIcon = ({ className, style }: IconProps) => (
  <MdOutlineFiberNew className={className} style={style} />
);

export const BrokenImageIcon = ({ className, style }: IconProps) => (
  <MdBrokenImage className={className} style={style} />
);
