interface BrandLogoProps {
  showName?: boolean;
  iconSizeClass?: string;
  textSizeClass?: string;
}

export const LIGHT_LOGO_SRC = '/assets/aistudio/jh-light_975fd8bc.svg';
export const DARK_LOGO_SRC = '/assets/aistudio/jh-dark_8b71aaf0.svg';

export function BrandLogo({
  showName = true,
  iconSizeClass = 'w-8 h-8 sm:w-9 sm:h-9',
  textSizeClass = 'text-[22px] sm:text-[25px]',
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <img
        src={LIGHT_LOGO_SRC}
        alt=""
        aria-hidden="true"
        className={`${iconSizeClass} object-contain rounded-md shrink-0 dark:hidden`}
      />
      <img
        src={DARK_LOGO_SRC}
        alt=""
        aria-hidden="true"
        className={`${iconSizeClass} object-contain rounded-md shrink-0 hidden dark:block`}
      />
      {showName && (
        <span
          className={`font-editorial ${textSizeClass} leading-none font-medium tracking-[0.14em] text-[#2A1810] dark:text-[#F4DFB6]`}
        >
          Jhonty Hub
        </span>
      )}
    </span>
  );
}
