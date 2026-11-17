let status = "memuat";

const getStatus = () => status;

const setStatus = (newStatus) => {
  status = newStatus;
};

module.exports = {
  getStatus,
  setStatus,
};
