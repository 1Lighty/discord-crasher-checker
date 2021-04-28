/* —————————————————— Copyright (c) Google, Apache License 2.0 —————————————————
 *
 * https://fonts.google.com/icons
 *
 * ————————————————————————————————————————————————————————————————————————————— */

const { React } = require('powercord/webpack');

module.exports = function Unsafe(props) {
  const { size = 24 } = props;
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' {...props}>
      <path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' fill='currentColor'/>
    </svg>
  );
};
