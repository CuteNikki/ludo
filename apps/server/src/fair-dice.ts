export class FairDice {
  private readonly bags = new Map<string, number[]>();

  roll(playerId: string): number {
    let bag = this.bags.get(playerId);
    if (!bag?.length) {
      bag = this.shuffle([1, 2, 3, 4, 5, 6]);
      this.bags.set(playerId, bag);
    }
    return bag.pop()!;
  }

  removePlayer(playerId: string): void {
    this.bags.delete(playerId);
  }

  private shuffle(values: number[]): number[] {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const randomIndex = secureRandomIndex(index + 1);
      [values[index], values[randomIndex]] = [values[randomIndex]!, values[index]!];
    }
    return values;
  }
}

function secureRandomIndex(upperBound: number): number {
  const range = 0x1_0000_0000;
  const unbiasedLimit = range - (range % upperBound);
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values);
  while (values[0]! >= unbiasedLimit);
  return values[0]! % upperBound;
}
