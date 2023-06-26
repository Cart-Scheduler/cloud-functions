/**
 * Chops given array into chunks where each chunk has max chunkLength
 * entries. Returns array of arrays.
 * @param {array} arr
 * @param {number} chunkLength
 * @return {array}
 */
exports.chopArray = (arr, chunkLength) => {
  const len = arr.length;
  if (!len) {
    return [[]];
  }
  const result = [];
  for (let i = 0; i < len; i += chunkLength) {
    result.push(arr.slice(i, i + chunkLength));
  }
  return result;
};
