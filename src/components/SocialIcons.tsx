import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const InstagramIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => {
  return (
    <svg
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 403.2 401.2"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <g>
        <ellipse cx="307.8" cy="94.5" rx="23.3" ry="23.3" transform="translate(212.9 402.2) rotate(-89.9)" fill="currentColor" />
        <path d="M399.8,106.6c-4.2-59.5-48.3-101.3-106.9-104.2-62.4-3-122.8-3.6-185.4.7C51.6,6.9,8,47.9,3.7,104.4c-4.9,64.8-5.2,128.5.4,193.1,4.9,56.4,47.8,97.8,103.6,100.8,64.3,3.5,125.8,4.4,192-.8,56.6-4.4,95.9-47.1,100-102,4.8-63.2,4.5-125.9,0-189ZM363.3,291.2c-2.1,37.2-28,68-67.3,70.5-65.2,4.2-127.5,4.7-190.4-.4-37.9-3.1-63-33.6-65.3-70.3-3.8-60.6-3.3-119.2-.4-180.1,1.8-36.9,27.7-67,65.7-70.2,64.9-5.4,129.8-5.4,194.7.4,35.6,3.1,60.5,32,62.8,66.8,4,61.8,3.7,121.6.3,183.4Z" fill="currentColor" />
      </g>
      <path d="M201.7,98c-56.7,0-102.6,45.9-102.6,102.6s45.9,102.6,102.6,102.6,102.6-45.9,102.6-102.6-45.9-102.6-102.6-102.6ZM201.5,267.4c-36.8,0-66.7-29.8-66.7-66.6s29.8-66.6,66.7-66.6,66.7,29.8,66.7,66.6-29.8,66.6-66.7,66.6Z" fill="currentColor" />
    </svg>
  );
};

export const TikTokIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => {
  return (
    <svg
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 349.7 396.4"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M254.8,265.7l-.4-132.1c29.7,20.4,59.9,31.8,95.3,31.3v-71.4c-52.3-2.5-91.7-41.4-97.1-93.4h-68.6c0,.1-.8,274.8-.8,274.8,0,29.1-28.2,49.4-51.9,50.9-28.2,1.8-53.5-16.3-59.1-44.2-4.1-20.3,3.8-40,18.3-52.1,15-12.4,33.3-18,55.3-11.5v-72.8c-61.7-8.9-122.4,28.1-140.4,88.9-22.5,75.7,29.2,150.9,104.5,161.1,77,10.4,145.2-49.3,145-129.6Z" fill="currentColor" />
    </svg>
  );
};

export const LinkedInIcon: React.FC<IconProps> = ({ size = 24, className, ...props }) => {
  return (
    <svg
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 384.3 373.1"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      {...props}
    >
      <path d="M55,89.1c26.3-3.8,40.4-25.6,37.9-49.5C90.6,17.7,71.2.2,47.3,0,18.3-.3-1.9,21.9.1,48.6c2,26.7,25.5,44.8,54.8,40.5ZM274.6,186.6c19.2,5,30.3,23,30.3,42l.2,144.1h79.2s-.6-154.2-.6-154.2c-.1-27.7-8.8-54.3-26.1-74.5-31.1-36.4-114.4-37.3-142.6,14.4l-1.6-34.4-76.5.4v247.9c0,0,79.1.5,79.1.5l.5-143.8c0-29.8,28.3-50.1,58.2-42.3ZM7.1,124v249c-.1,0,79.9,0,79.9,0V124.1c.1,0-79.9,0-79.9,0Z" fill="currentColor" />
    </svg>
  );
};
