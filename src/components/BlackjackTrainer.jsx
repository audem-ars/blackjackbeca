import React, { useState, useEffect } from 'react';

const BlackjackTrainer = () => {
  const [runningCount, setRunningCount] = useState(0);
  const [trueCount, setTrueCount] = useState(0);
  const [dealerHand, setDealerHand] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [gameState, setGameState] = useState('betting');
  const [deck, setDeck] = useState([]);
  const [decksRemaining, setDecksRemaining] = useState(6);
  const [deckCounts, setDeckCounts] = useState({});  // Track exact counts of each card value
  // eslint-disable-next-line no-unused-vars
const [splitHands, setSplitHands] = useState(null);
// eslint-disable-next-line no-unused-vars
const [currentSplitHand, setCurrentSplitHand] = useState(1);


  const initializeDeck = () => {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let newDeck = [];
    let newCounts = {};
    
    // Initialize card counts
    values.forEach(value => {
        if (['J', 'Q', 'K'].includes(value)) {
            newCounts['10'] = (newCounts['10'] || 0) + 24;
        } else {
            newCounts[value] = 24;
        }
    });
    
    // Create 6 decks worth of cards
    for (let d = 0; d < 6; d++) {
        for (const suit of suits) {
            for (const value of values) {
                newDeck.push({ 
                    suit, 
                    value,
                    id: `${d}-${suit}-${value}` // Add unique ID
                });
            }
        }
    }
    
    setDeck(newDeck);
    setDeckCounts(newCounts);
    setDecksRemaining(6);
    setRunningCount(0);
    setTrueCount(0);
};

  const getCardValue = (card) => {
    if (!card) return 0;
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
  };

  const getCardCount = (card) => {
    const value = getCardValue(card);
    if (value >= 2 && value <= 6) return 1;
    if (value >= 10 || value === 11) return -1;
    return 0;
  };

  const calculateProbability = (targetValue) => {
    const remainingCards = deck.filter(card => getCardValue(card) === targetValue).length;
    return remainingCards / deck.length;
  };

  const calculateHandValue = (hand) => {
    let value = 0;
    let aces = 0;
  
    for (const card of hand) {
      if (card.value === 'A') {
        aces += 1;
      } else {
        value += getCardValue(card);
      }
    }
  
    for (let i = 0; i < aces; i++) {
      if (value + 11 <= 21) {
        value += 11;
      } else {
        value += 1;
      }
    }
  
    return value;
  };

  const calculateBustProbability = (currentValue) => {
    let bustProb = 0;
    for (let value = 2; value <= 11; value++) {
      if (currentValue + value > 21) {
        bustProb += calculateProbability(value);
      }
    }
    return bustProb;
  };
  // eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-unused-vars
  const calculateDealerProbabilities = (upCard) => {
     const results = {
      bust: 0,
      seventeen: 0,
      eighteen: 0,
      nineteen: 0,
      twenty: 0,
      twentyone: 0
    };
     // eslint-disable-next-line no-unused-vars
    let iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      let currentValue = getCardValue(upCard);
      // eslint-disable-next-line no-unused-vars
      let currentHand = [upCard];
      
      while (currentValue < 17) {
        const nextCardValue = Math.floor(Math.random() * 13) + 1;
        currentValue += Math.min(nextCardValue, 10);
        if (currentValue > 21) {
          results.bust++;
          break;
        }
      }
      
      if (currentValue <= 21) {
        switch(currentValue) {
          case 17: results.seventeen++; break;
          case 18: results.eighteen++; break;
          case 19: results.nineteen++; break;
          case 20: results.twenty++; break;
          case 21: results.twentyone++; break;
          default: break;
        }
      }
    }
    
    Object.keys(results).forEach(key => {
      results[key] = results[key] / iterations;
    });
    
    return results;
  };
  
  const calculateDealerFinal = (startValue) => {
    let probs = {};
    
    const calcDealerPath = (currentValue, depth = 0, probability = 1.0) => {
        if (depth > 5) return;
        
        if (currentValue > 21) {
            probs['bust'] = (probs['bust'] || 0) + probability;
            return;
        }
        
        if (currentValue >= 17) {
            probs[currentValue] = (probs[currentValue] || 0) + probability;
            return;
        }
        
        for (let card = 2; card <= 11; card++) {
            const prob = calculateExactProbability(card);
            if (prob > 0) {
                let newValue = currentValue + (card === 11 && currentValue + 11 > 21 ? 1 : card);
                calcDealerPath(newValue, depth + 1, probability * prob);
            }
        }
    };
    
    calcDealerPath(startValue);
    return probs;
};


const calculateStandEV = (playerValue, dealerUpCard) => {
  if (playerValue > 21) return -1;
  
  const dealerProbs = calculateDealerFinal(getCardValue(dealerUpCard));
  let ev = 0;
  
  // Win when dealer busts
  ev += dealerProbs['bust'] || 0;
  
  // For each possible dealer total
  for (let dealerTotal = 17; dealerTotal <= 21; dealerTotal++) {
      const prob = dealerProbs[dealerTotal] || 0;
      if (playerValue > dealerTotal) {
          ev += prob;  // Win
      } else if (playerValue < dealerTotal) {
          ev -= prob;  // Loss
      }
      // Push (equal values) has 0 impact on EV
  }
  
  return ev;
};

  const calculateHitEV = (playerValue, dealerUpCard, depth = 0) => {
    if (playerValue >= 21 || depth > 3) return -1;
    
    let ev = 0;
    let totalProb = 0;
    
    // Consider all possible next cards
    for (let cardValue = 2; cardValue <= 11; cardValue++) {
        const prob = calculateExactProbability(cardValue);
        if (prob > 0) {
            totalProb += prob;
            
            // Handle Aces flexibly
            let newValue = playerValue;
            if (cardValue === 11) { // Ace
                newValue += (newValue + 11 <= 21) ? 11 : 1;
            } else {
                newValue += cardValue;
            }
            
            if (newValue > 21) {
                ev -= prob;  // Bust
            } else {
                // Consider both standing and hitting with new hand
                const standEV = calculateStandEV(newValue, dealerUpCard);
                const hitEV = (depth < 2) ? calculateHitEV(newValue, dealerUpCard, depth + 1) : -1;
                ev += prob * Math.max(standEV, hitEV);  // Take best action
            }
        }
    }
    
    return totalProb > 0 ? ev / totalProb : -1;
};
  
  
const calculateDoubleEV = (playerValue, dealerUpCard) => {
  if (playerValue >= 21 || playerHand.length !== 2) return -999;
  
  let ev = 0;
  let totalProb = 0;
  
  for (let card = 2; card <= 11; card++) {
      const prob = calculateExactProbability(card);
      if (prob > 0) {
          let newValue = playerValue + (card === 11 && playerValue + 11 > 21 ? 1 : card);
          totalProb += prob;
          
          if (newValue > 21) {
              ev -= 2 * prob;
          } else {
              ev += 2 * prob * calculateStandEV(newValue, dealerUpCard);
          }
      }
  }
  
  return totalProb > 0 ? ev / totalProb : -999;
};
  
const calculateSplitEV = (dealerUpCard) => {
  if (playerHand.length !== 2 || playerHand[0].value !== playerHand[1].value) return -999;
  
  const cardValue = getCardValue(playerHand[0]);
  let ev = 0;
  let totalProb = 0;
  
  // For each possible card drawn to each split hand
  for (let firstCard = 2; firstCard <= 11; firstCard++) {
    const firstProb = calculateExactProbability(firstCard);
    if (firstProb <= 0) continue;
    
    let firstTotal = cardValue + firstCard;
    if (firstCard === 11 && firstTotal > 21) firstTotal = cardValue + 1;
    
    for (let secondCard = 2; secondCard <= 11; secondCard++) {
      const secondProb = calculateExactProbability(secondCard);
      if (secondProb <= 0) continue;
      
      let secondTotal = cardValue + secondCard;
      if (secondCard === 11 && secondTotal > 21) secondTotal = cardValue + 1;
      
      const firstEV = firstTotal >= 21 ? -1 : Math.max(
        calculateStandEV(firstTotal, dealerUpCard),
        calculateHitEV(firstTotal, dealerUpCard)
      );
      
      const secondEV = secondTotal >= 21 ? -1 : Math.max(
        calculateStandEV(secondTotal, dealerUpCard),
        calculateHitEV(secondTotal, dealerUpCard)
      );
      
      ev += firstProb * secondProb * (firstEV + secondEV);
      totalProb += firstProb * secondProb;
    }
  }
  
  return totalProb > 0 ? ev / 2 : -999;
};
  

  const calculateExactProbability = (targetValue) => {
    const numCards = Object.values(deckCounts).reduce((a, b) => a + b, 0);
    const targetCount = deckCounts[targetValue.toString()] || 0;
    return targetCount / numCards;
  };

  const removeCard = (card) => {
    const value = ['J', 'Q', 'K'].includes(card.value) ? '10' : card.value;
    setDeckCounts(prev => ({
      ...prev,
      [value]: prev[value] - 1
    }));
  };

  const drawCard = () => {
    if (deck.length === 0) return null;
    
    // Get a random card from remaining deck
    const randomIndex = Math.floor(Math.random() * deck.length);
    const newDeck = [...deck];
    const card = newDeck.splice(randomIndex, 1)[0];
    setDeck(newDeck);
    removeCard(card);
    return card;
};

const handleSplit = () => {
  const hand1Card = playerHand[0];
  const hand2Card = playerHand[1];
  const newCard1 = drawCard();
  const newCard2 = drawCard();
  
  setSplitHands({
    currentHand: 1,
    hand1: [hand1Card, newCard1],
    hand2: [hand2Card, newCard2],
    hand1Complete: false,
    hand2Complete: false
  });

  // Show first hand initially
  setPlayerHand([hand1Card, newCard1]);
};

// Add this to track completion of hands
const completeHand = () => {
  if (splitHands.currentHand === 1) {
    setSplitHands({
      ...splitHands,
      hand1Complete: true,
      currentHand: 2
    });
    setPlayerHand(splitHands.hand2);
  } else {
    // Both hands complete
    stand();
  }
};


const calculateOptimalStrategy = () => {
  const playerValue = calculateHandValue(playerHand);
  const dealerUpCard = dealerHand[0];
  const strategies = [];
  
  // Basic actions
  const standEV = calculateStandEV(playerValue, dealerUpCard);
  const hitEV = calculateHitEV(playerValue, dealerUpCard);
  
  strategies.push(
    { action: 'Stand', ev: standEV },
    { action: 'Hit', ev: hitEV }
  );
  
  // Initial two-card options
  if (playerHand.length === 2) {
    strategies.push({ action: 'Double', ev: calculateDoubleEV(playerValue, dealerUpCard) });
    strategies.push({ action: 'Surrender', ev: -0.5 }); 
    
    if (playerHand.length === 2 && (
      playerHand[0].value === playerHand[1].value || 
      (getCardValue(playerHand[0]) === 10 && getCardValue(playerHand[1]) === 10)
    )) {
      strategies.push({ action: 'Split', ev: calculateSplitEV(dealerUpCard) });
    }
  }
  
  return strategies.sort((a, b) => b.ev - a.ev);
};
  
  const updateCounts = (cards) => {
    const newRunningCount = cards.reduce((count, card) => count + getCardCount(card), runningCount);
    const remainingDecks = Math.max((deck.length / 52).toFixed(2), 0.5);
    setDecksRemaining(remainingDecks);
    setRunningCount(newRunningCount);
    setTrueCount((newRunningCount / remainingDecks).toFixed(2));
  };


  const startHand = () => {
    if (deck.length < 52) {
      initializeDeck();
      return;
    }

    const pCard1 = drawCard();
    const dCard1 = drawCard();
    const pCard2 = drawCard();
    const dCard2 = drawCard();

    const newPlayerHand = [pCard1, pCard2];
    const newDealerHand = [dCard1, dCard2];

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    updateCounts([pCard1, pCard2, dCard1]);
    setGameState('playing');
  };

  const hit = () => {
    const card = drawCard();
    if (!card) return;
    
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    updateCounts([card]);
    
    if (calculateHandValue(newHand) > 21) {
      if (splitHands && !splitHands.hand1Complete) {
        setSplitHands({
          ...splitHands,
          hand1Complete: true,
          hand1: newHand
        });
        setPlayerHand(splitHands.hand2);
      } else {
        setGameState('bust');
      }
    }
  };

  const stand = () => {
    if (splitHands && !splitHands.hand1Complete) {
      setSplitHands({
        ...splitHands,
        hand1Complete: true,
        hand1: playerHand
      });
      setPlayerHand(splitHands.hand2);
    } else if (splitHands) {
      let currentDealerHand = [...dealerHand];
      while (calculateHandValue(currentDealerHand) < 17) {
        const card = drawCard();
        if (!card) break;
        currentDealerHand.push(card);
        updateCounts([card]);
      }
      setDealerHand(currentDealerHand);
      setGameState('complete');
    } else {
      let currentDealerHand = [...dealerHand];
      while (calculateHandValue(currentDealerHand) < 17) {
        const card = drawCard();
        if (!card) break;
        currentDealerHand.push(card);
        updateCounts([card]);
      }
      setDealerHand(currentDealerHand);
      setGameState('complete');
    }
  };

  useEffect(() => {
    initializeDeck();
  }, []);

  const renderCard = (card) => {
    if (!card) return null;
    const color = ['♥', '♦'].includes(card.suit) ? '#ff0000' : '#000000';
    return (
      <div style={{
        width: '60px',
        height: '90px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '4px',
        color: color,
        fontSize: '18px',
        fontFamily: 'monospace'
      }}>
        {card.value}{card.suit}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
        <div>Running Count: {runningCount}</div>
        <div>True Count: {trueCount}</div>
        <div>Decks: {decksRemaining}</div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Dealer ({gameState === 'playing' ? getCardValue(dealerHand[0]) : calculateHandValue(dealerHand)})</h3>
        <div style={{ display: 'flex' }}>
          {dealerHand.map((card, i) => (
            <div key={i}>
              {gameState === 'playing' && i === 1 ? 
                <div style={{
                  width: '60px',
                  height: '90px',
                  backgroundColor: '#2563eb',
                  borderRadius: '8px',
                  margin: '4px'
                }} /> :
                renderCard(card)
              }
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
  {splitHands ? (
    <>
      <h3>Split Hand 1 ({calculateHandValue(!splitHands.hand1Complete ? playerHand : splitHands.hand1)})</h3>
      <div style={{ display: 'flex' }}>
        {!splitHands.hand1Complete ? 
          playerHand.map((card, i) => renderCard(card)) :
          splitHands.hand1.map((card, i) => renderCard(card))
        }
      </div>
      <h3>Split Hand 2 ({calculateHandValue(splitHands.hand1Complete ? playerHand : splitHands.hand2)})</h3>
      <div style={{ display: 'flex' }}>
        {splitHands.hand1Complete ? 
          playerHand.map((card, i) => renderCard(card)) :
          splitHands.hand2.map((card, i) => renderCard(card))
        }
      </div>
    </>
  ) : (
    <>
      <h3>Player ({calculateHandValue(playerHand)})</h3>
      <div style={{ display: 'flex' }}>
        {playerHand.map((card, i) => renderCard(card))}
      </div>
    </>
  )}
</div>

      <div style={{ marginBottom: '20px' }}>
        {gameState === 'betting' && (
          <button 
            onClick={startHand}
            style={{
              padding: '8px 16px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Deal
          </button>
        )}
        {gameState === 'playing' && (
          <div>
           {['Hit', 'Stand', 'Double', 'Split', 'Surrender'].filter(action => {
              if (action === 'Double' || action === 'Surrender') return playerHand.length === 2 && !splitHands;
              if (action === 'Split') {
                return playerHand.length === 2 && (
                  playerHand[0].value === playerHand[1].value || 
                  (["10", "J", "Q", "K"].includes(playerHand[0].value) && 
                   ["10", "J", "Q", "K"].includes(playerHand[1].value))
                );
              }
              playerHand[0].value === playerHand[1].value || 
(["J", "Q", "K", "10"].includes(playerHand[0].value) && 
 ["J", "Q", "K", "10"].includes(playerHand[1].value))
              return true;
            }).map((action) => (
              <button
                key={action}
                onClick={() => {
                  switch(action) {
                    case 'Hit': hit(); break;
                    case 'Stand': stand(); break;
                    case 'Double': hit(); stand(); break;
                    case 'Split': handleSplit(); break;
                    case 'Surrender': setGameState('complete'); break;
                    default: break;
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '16px',
                  marginRight: '10px',
                  cursor: 'pointer',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
        {['bust', 'complete'].includes(gameState) && (
          <button
          onClick={() => { 
            setGameState('betting'); 
            setPlayerHand([]); 
            setDealerHand([]);
            setSplitHands(null);  // Add this line
          }}
            style={{
              padding: '8px 16px',
              fontSize: '16px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            New Hand
          </button>
        )}
      </div>

      {gameState === 'playing' && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          borderRadius: '4px',
          backgroundColor: 'rgba(218, 165, 32, 0.2)'
        }}>
          <h3 style={{ marginTop: 0 }}>Strategy Advice</h3>
          {calculateOptimalStrategy().map((strat, i) => (
            <div key={i} style={{ 
              marginBottom: '8px',
              fontSize: '16px'
            }}>
              {strat.action}: EV {(strat.ev * 100).toFixed(1)}%
            </div>
          ))}
          <div style={{ fontSize: '16px' }}>
            Bust Probability: {(calculateBustProbability(calculateHandValue(playerHand)) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackjackTrainer;