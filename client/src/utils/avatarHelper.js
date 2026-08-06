export function getEmployeeAvatar(employeeId) {
  const mapping = {
    'EMP001': 'Husnain.jpeg',
    'EMP002': 'Samaira.jpeg',
    'EMP003': 'Shahzaib.jpeg',
    'EMP004': 'Shahbaz.jpeg',
    'EMP005': 'Rehan.jpeg',
    'EMP006': 'Adnan-Tahir.jpeg',
    'EMP007': 'Adnan-Ali.jpeg',
    'EMP008': 'Soulat.jpeg',
    'EMP009': 'Muneeb.jpeg',
    'EMP010': 'Zahid.jpeg',
    'EMP011': 'Tajammul.jpeg',
    'ADMIN001': 'logo.jpeg',
    'SYSADMIN001': 'logo.jpeg'
  };
  const filename = mapping[String(employeeId || '').trim().toUpperCase()];
  return filename ? `/assets/images/${filename}` : '/assets/images/logo.jpeg';
}

export function getAvatarByName(name) {
  const clean = String(name || '').toLowerCase().trim();
  if (clean.includes('husnain')) return '/assets/images/Husnain.jpeg';
  if (clean.includes('samaira')) return '/assets/images/Samaira.jpeg';
  if (clean.includes('shahzaib')) return '/assets/images/Shahzaib.jpeg';
  if (clean.includes('shahbaz')) return '/assets/images/Shahbaz.jpeg';
  if (clean.includes('rehan')) return '/assets/images/Rehan.jpeg';
  if (clean.includes('adnan tahir')) return '/assets/images/Adnan-Tahir.jpeg';
  if (clean.includes('adnan ali')) return '/assets/images/Adnan-Ali.jpeg';
  if (clean.includes('soulat')) return '/assets/images/Soulat.jpeg';
  if (clean.includes('muneeb')) return '/assets/images/Muneeb.jpeg';
  if (clean.includes('zahid')) return '/assets/images/Zahid.jpeg';
  if (clean.includes('tajammul')) return '/assets/images/Tajammul.jpeg';
  return '/assets/images/logo.jpeg';
}
