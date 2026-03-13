const fs = require('fs');

const content = fs.readFileSync('App.tsx', 'utf8');

const startIdx = content.indexOf('{/* New Rental Modal */}');
const endIdx = content.indexOf('{/* Quotation Modal */}');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find modal boundaries');
  process.exit(1);
}

let newModal = content.substring(startIdx, endIdx);

// Modify the modal
newModal = newModal.replace('{/* New Rental Modal */}', '{/* Edit Rental Modal */}');
newModal = newModal.replace(/isRentalModalOpen/g, 'isEditRentalModalOpen');
newModal = newModal.replace(/setIsRentalModalOpen/g, 'setIsEditRentalModalOpen');
newModal = newModal.replace(/handleCreateRental/g, 'submitEditRental');
newModal = newModal.replace(/New Rental Contract/g, 'Edit Rental Contract');
newModal = newModal.replace(/Create Contract/g, 'Save Changes');

// Insert the new modal before the Quotation Modal
const newContent = content.substring(0, endIdx) + newModal + content.substring(endIdx);

fs.writeFileSync('App.tsx', newContent);
console.log('Successfully added Edit Rental Modal');
