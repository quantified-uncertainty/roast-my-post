// Results page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Filter functionality
  const filterButtons = document.querySelectorAll('.filter-btn');
  const rows = document.querySelectorAll('tbody tr:not(.details-row)');
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      rows.forEach(row => {
        let show = false;
        
        switch (filter) {
          case 'all':
            show = true;
            break;
          case 'passed':
            show = row.dataset.status === 'passed';
            break;
          case 'failed':
            show = row.dataset.status === 'failed';
            break;
          case 'inconsistent':
            show = parseInt(row.dataset.consistency) < 100;
            break;
        }
        
        row.style.display = show ? '' : 'none';
        // Also hide/show the details row
        const detailsRow = row.nextElementSibling;
        if (detailsRow && detailsRow.classList.contains('details-row')) {
          detailsRow.style.display = show && detailsRow.style.display !== 'none' ? '' : 'none';
        }
      });
    });
  });
});

// Toggle details row
function toggleDetails(testId) {
  const detailsRow = document.getElementById(`details-${testId}`);
  if (detailsRow) {
    detailsRow.style.display = detailsRow.style.display === 'none' ? '' : 'none';
  }
}