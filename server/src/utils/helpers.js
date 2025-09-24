class Helpers {
  // Gerar ID único
  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Calcular distância entre dois pontos 3D
  static calculateDistance(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
  }

  // Verificar se dois pontos estão dentro de um raio
  static isInRange(x1, y1, z1, x2, y2, z2, range) {
    return this.calculateDistance(x1, y1, z1, x2, y2, z2) <= range;
  }

  // Gerar número aleatório entre min e max
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Gerar número aleatório entre 0 e 1 com distribuição normal
  static randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Validar nome de usuário
  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  // Validar nome de personagem
  static isValidCharacterName(name) {
    const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return nameRegex.test(name);
  }

  // Sanitizar entrada de dados
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }
}

module.exports = Helpers;