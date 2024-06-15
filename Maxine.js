const mineflayer = require('mineflayer')
const pvp = require('mineflayer-pvp').plugin
const { pathfinder, Movements, goals} = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const autoeat = require('mineflayer-auto-eat')
const { GoalFollow } = goals;
const { GoalNear } = goals;

const bot = mineflayer.createBot({
    host: 'MaxArti.aternos.me',
    port: 45017,
    username: 'Maxine',
    
})

bot.loadPlugin(pvp)
bot.loadPlugin(armorManager)                                                                      
bot.loadPlugin(pathfinder)
bot.loadPlugin(autoeat)



let movePos = null;
let isFighting = false;

function moveToPlayer() {
  if (movePos) {
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(new goals.GoalBlock(movePos.position.x, movePos.position.y, movePos.position.z));
  }
}

function eatAndReengage() {
  const food = bot.inventory.items().find(item =>
    item.name.includes('cooked_porkchop') ||
    item.name.includes('apple') ||
    item.name.includes('bread') ||
    item.name.includes('steak') ||
    item.name.includes('cooked_chicken') ||
    item.name.includes('cooked_mutton') ||
    item.name.includes('cooked_fish') ||
    item.name.includes('potato')
  );

  if (food) {
    bot.equip(food, 'hand', (err) => {
      if (err) {
        console.log('Error equipping food:', err);
        return;
      }

      bot.consume((err) => {
        if (err) {
          console.log('Error consuming food:', err);
        } else {
          console.log('Consumed food.');
          reEquipSwordAndAttack();
        }
      });
    });
  } else {
    console.log('No food found in inventory.');
  }
}

function reEquipSwordAndAttack() {
  const sword = bot.inventory.items().find(item => item.name.includes('sword'));
  if (sword) {
    bot.equip(sword, 'hand', (err) => {
      if (err) {
        console.log('Error equipping sword after eating:', err);
      } else {
        console.log('Re-equipped sword after eating.');
        if (movePos && bot.players[movePos.username] && bot.players[movePos.username].entity) {
          bot.pvp.attack(bot.players[movePos.username].entity);
        } else {
          console.log('Player not found after eating.');
        }
      }
    });
  } else {
    console.log('No sword found in inventory.');
  }
}

function checkHealthAndEat() {
  if (bot.health < 10 && bot.food < 20 && isFighting) {
    console.log('Health is low and food points are not max, eating food.');
    bot.pvp.stop(); // Stop combat
    eatAndReengage();
  }
}

bot.once('spawn', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: [],
    checkOnItemPickup: true,
    equipOldItem: true
  };
  bot.autoEat.disable();
  setInterval(checkHealthAndEat, 1000);
});

bot.on('physicTick', () => {
  if (bot.pvp.target) return
  if (bot.pathfinder.isMoving()) return

  const entity = bot.nearestEntity()
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
})

bot.on('playerCollect', (collector, itemDrop) => {
  if (collector !== bot.entity) return;

  setTimeout(() => {
    const shield = bot.inventory.items().find(item => item.name.includes('shield'));
    if (shield) bot.equip(shield, 'off-hand');
  }, 250);
});

bot.on('autoeat_started', () => {
  console.log('Auto Eat started!');
});

bot.on('autoeat_stopped', () => {
  console.log('Auto Eat stopped!');
});

bot.on('health', () => {
  console.log("Health: ", bot.health);
  console.log("FoodPoints: ", bot.food);
  if (bot.health!==20 && bot.food!==20){
    bot.autoEat.eat()

  }
});

bot.on('physicTick', () => {
  if (bot.pvp.target) return
  if (bot.pathfinder.isMoving()) return

  const entity = bot.nearestEntity()
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
})



bot.on('chat', (username, message) => {
  if (message === 'fight me') {
    const player = bot.players[username];
    if (!player || !player.entity) {
      bot.chat("I can't see you.");
      return;
    }
    bot.chat('Prepare to fight!');
    movePos = { username: username, position: player.entity.position.clone() };
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new GoalFollow(player.entity, 1), true);
    isFighting = true;
    const sword = bot.inventory.items().find(item => item.name.includes('sword'));
    bot.equip(sword, 'hand');
    bot.pvp.attack(player.entity);
  }

  if (message === 'come here') {
    const player = bot.players[username];
    if (player) {
      bot.chat("Okay, coming!");
      movePos = { username: username, position: player.entity.position.clone() };
      moveToPlayer();
    }
  }
});

bot.on('playerCollect', (collector, itemDrop) => {
  if (collector !== bot.entity) return;

  setTimeout(() => {
    const sword = bot.inventory.items().find(item => item.name.includes('sword'));
    if (sword) bot.equip(sword, 'hand');
  }, 100);
});

bot.on('physicTick', () => {
  if (!isFighting) return;

  if (bot.pathfinder.isMoving()) return;

  const player = bot.players[movePos?.username];
  if (player && player.entity) {
    bot.pathfinder.setGoal(new GoalFollow(player.entity, 1), true);

    if (bot.health < 10 && bot.food < 20) {
      console.log('Health is low, disengaging to eat.');
      bot.pvp.stop(); // Stop combat
      eatAndReengage();
    } else {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'));
      bot.equip(sword, 'hand');
      bot.pvp.attack(player.entity);
    }
  } else {
    console.log("Player not found, stopping combat.");
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
    isFighting = false;
  }
});