import React from 'react';
import { SVG } from 'components/Icons';

import PreloadIcon from 'resources/icons/preload.svg';

// Using inline style since css file might not have been loaded
const splashScreenStyles: React.CSSProperties = {
  position: 'relative',
  top: '25%',
  margin: '0 auto',
  width: '200p',
  textAlign: 'center',
  color: '#f5f8fa',
  zIndex: 2,
};

const textStyles: React.CSSProperties = {
  margin: '0',
  fontSize: '18px',
  fontWeight: 700,
  fontFamily:
    '-apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", \
    "Open Sans", "Helvetica Neue", "Icons16", sans-serif',
};

const SplashScreen = () => (
  <>
  <div style={splashScreenStyles}>
    <svg style={{ width: 0 }}>
      <defs>
        <linearGradient id="yellow-blue" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7EA3A" stopOpacity="1">
            <animate
              attributeName="stop-color"
              values="#F7EA3A;#009DE0;#F7EA3A;#009DE0;#F7EA3A;#009DE0"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#009DE0" stopOpacity="1">
            <animate
              attributeName="stop-color"
              values="#F7EA3A;#009DE0;#F7EA3A;#009DE0;#F7EA3A;#009DE0"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="offset"
              values=".95;.80;.60;.40;.20;0;.20;.40;.60;.80;.95"
              dur="2s"
            />
          </stop>
        </linearGradient>
      </defs>
    </svg>

    <SVG src={PreloadIcon} style={{ fill: 'url(#yellow-blue)', width: '48px', height: '36px' }} />

    <p style={textStyles} className="preloader">
      Allusion
    </p>
  </div>
    <div className={'grad'}></div>
    <div className={'splash'}></div>
    </>
);

export default SplashScreen;
