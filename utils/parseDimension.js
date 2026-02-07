const parseDimension = (dimension) => {
  if (!dimension || typeof dimension !== 'string') return { width: null, profile: null, diameter: null };
  const match = dimension.match(/(\d{3})\/(\d{2})R(\d{2})/i);
  if (!match) return { width: null, profile: null, diameter: null };
  return {
    width: Number(match[1]),
    profile: Number(match[2]),
    diameter: Number(match[3])
  };
};

module.exports = parseDimension;
