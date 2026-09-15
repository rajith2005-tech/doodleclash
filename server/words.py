"""
DoodleClash Word Dictionary & Vector Stroke Presets
Categories: Animals, Food, Objects, Tech, Nature, Fantasy
"""

WORD_CATEGORIES = {
    "animals": {
        "name": "🐶 Animals & Creatures",
        "words": [
            {"word": "Elephant", "hint": "Large animal with a trunk", "difficulty": 1},
            {"word": "Penguin", "hint": "Flightless bird in tuxedos", "difficulty": 1},
            {"word": "Giraffe", "hint": "Tallest mammal with long neck", "difficulty": 1},
            {"word": "Dolphin", "hint": "Intelligent aquatic mammal", "difficulty": 1},
            {"word": "Kangaroo", "hint": "Hops and carries baby in pouch", "difficulty": 1},
            {"word": "Flamingo", "hint": "Pink bird standing on one leg", "difficulty": 2},
            {"word": "Chameleon", "hint": "Reptile that changes color", "difficulty": 2},
            {"word": "Octopus", "hint": "Sea creature with eight arms", "difficulty": 1},
            {"word": "Cheetah", "hint": "Fastest land animal", "difficulty": 2},
            {"word": "Hedgehog", "hint": "Small spiky animal", "difficulty": 2},
            {"word": "Koala", "hint": "Eats eucalyptus in Australia", "difficulty": 1},
            {"word": "Peacock", "hint": "Bird with colorful eye-spotted tail", "difficulty": 2},
            {"word": "Crocodile", "hint": "Large aquatic reptile with big teeth", "difficulty": 1},
            {"word": "Butterfly", "hint": "Insect with colorful wings", "difficulty": 1},
            {"word": "Squirrel", "hint": "Bushy-tailed rodent loving acorns", "difficulty": 1},
            {"word": "Walrus", "hint": "Large sea mammal with long tusks", "difficulty": 2},
            {"word": "Owl", "hint": "Nocturnal bird known for wisdom", "difficulty": 1},
            {"word": "Jellyfish", "hint": "Umbrella-shaped gelatinous creature", "difficulty": 2},
            {"word": "Hummingbird", "hint": "Tiny bird that can fly backwards", "difficulty": 3},
            {"word": "Platypus", "hint": "Duck-billed egg-laying mammal", "difficulty": 3}
        ]
    },
    "food": {
        "name": "🍕 Food & Drinks",
        "words": [
            {"word": "Pizza", "hint": "Italian cheesy pie with toppings", "difficulty": 1},
            {"word": "Hamburger", "hint": "Patty between two buns", "difficulty": 1},
            {"word": "Sushi", "hint": "Japanese rice rolled with seaweed & fish", "difficulty": 2},
            {"word": "Ice Cream", "hint": "Frozen sweet dessert in a cone", "difficulty": 1},
            {"word": "Pancake", "hint": "Flat round cake topped with syrup", "difficulty": 1},
            {"word": "Taco", "hint": "Mexican crispy folded shell with fillings", "difficulty": 1},
            {"word": "Popcorn", "hint": "Puffed corn snack at the cinema", "difficulty": 1},
            {"word": "Avocado", "hint": "Green pear-shaped fruit with large pit", "difficulty": 2},
            {"word": "Cupcake", "hint": "Small personal cake with frosting", "difficulty": 1},
            {"word": "Watermelon", "hint": "Big green fruit with red juicy inside", "difficulty": 1},
            {"word": "Croissant", "hint": "Buttery flaky French crescent pastry", "difficulty": 2},
            {"word": "Spaghetti", "hint": "Long thin pasta strings with sauce", "difficulty": 1},
            {"word": "Pineapple", "hint": "Tropical fruit with prickly skin & crown", "difficulty": 2},
            {"word": "Boba Tea", "hint": "Sweet milk tea with tapioca pearls", "difficulty": 2},
            {"word": "Donut", "hint": "Fried dough ring with sweet glaze", "difficulty": 1},
            {"word": "Burrito", "hint": "Rolled flour tortilla with meat & beans", "difficulty": 2},
            {"word": "Waffle", "hint": "Grid-patterned breakfast pastry", "difficulty": 1},
            {"word": "Hot Dog", "hint": "Sausage in a sliced bun", "difficulty": 1},
            {"word": "Cheesecake", "hint": "Rich dessert made with cream cheese", "difficulty": 2},
            {"word": "Pretzel", "hint": "Knot-shaped salted baked pastry", "difficulty": 2}
        ]
    },
    "objects": {
        "name": "🎸 Everyday Objects & Tools",
        "words": [
            {"word": "Guitar", "hint": "Stringed musical instrument", "difficulty": 1},
            {"word": "Umbrella", "hint": "Shields you from the rain", "difficulty": 1},
            {"word": "Telescope", "hint": "Used to look at distant stars", "difficulty": 2},
            {"word": "Hourglass", "hint": "Measures time with trickling sand", "difficulty": 2},
            {"word": "Backpack", "hint": "Bag carried on shoulders", "difficulty": 1},
            {"word": "Flashlight", "hint": "Handheld battery-powered light", "difficulty": 1},
            {"word": "Microphone", "hint": "Amplifies your singing voice", "difficulty": 1},
            {"word": "Compass", "hint": "Navigational tool pointing North", "difficulty": 2},
            {"word": "Bicycle", "hint": "Two-wheeled pedal transport", "difficulty": 1},
            {"word": "Camera", "hint": "Captures photos and memories", "difficulty": 1},
            {"word": "Scissors", "hint": "Tool used for cutting paper", "difficulty": 1},
            {"word": "Skateboard", "hint": "Deck on four wheels for tricks", "difficulty": 1},
            {"word": "Lantern", "hint": "Enclosed lamp with glowing flame", "difficulty": 2},
            {"word": "Sunglasses", "hint": "Protects eyes from bright sunlight", "difficulty": 1},
            {"word": "Anchor", "hint": "Heavy iron hook keeping ships still", "difficulty": 2},
            {"word": "Teapot", "hint": "Pours hot aromatic tea", "difficulty": 1},
            {"word": "Binoculars", "hint": "Two lenses held to eyes for distance", "difficulty": 2},
            {"word": "Paintbrush", "hint": "Tool used to apply paint to canvas", "difficulty": 1},
            {"word": "Boomerang", "hint": "Curved throwing weapon that returns", "difficulty": 3},
            {"word": "Magnifying Glass", "hint": "Lens that makes small things look big", "difficulty": 2}
        ]
    },
    "tech": {
        "name": "💻 Tech, Gaming & Sci-Fi",
        "words": [
            {"word": "Robot", "hint": "Automated mechanical machine", "difficulty": 1},
            {"word": "Rocket", "hint": "Propels spacecraft into outer space", "difficulty": 1},
            {"word": "Satellite", "hint": "Orbits the earth transmitting signals", "difficulty": 2},
            {"word": "Game Controller", "hint": "Handheld pad used to play video games", "difficulty": 1},
            {"word": "Headphones", "hint": "Worn over ears to listen to music", "difficulty": 1},
            {"word": "Drone", "hint": "Remote controlled flying quadcopter", "difficulty": 2},
            {"word": "Smartwatch", "hint": "Digital timepiece tracking steps & heart", "difficulty": 2},
            {"word": "Astronaut", "hint": "Person exploring outer space", "difficulty": 2},
            {"word": "Virtual Reality", "hint": "Headset immersing you in 3D worlds", "difficulty": 3},
            {"word": "Cyberpunk", "hint": "Futuristic neon high-tech dystopia", "difficulty": 3},
            {"word": "Alien", "hint": "Extraterrestrial lifeform", "difficulty": 1},
            {"word": "Spaceship", "hint": "Vessel cruising between galaxies", "difficulty": 2},
            {"word": "Keyboard", "hint": "Keys pressed to type code and words", "difficulty": 1},
            {"word": "Laser", "hint": "Focused beam of intense coherent light", "difficulty": 2},
            {"word": "Hoverboard", "hint": "Floating skateboard without wheels", "difficulty": 2},
            {"word": "Microchip", "hint": "Tiny silicon wafer powering computers", "difficulty": 3},
            {"word": "Hologram", "hint": "3D projection made of light", "difficulty": 3},
            {"word": "Battery", "hint": "Stores electrical energy", "difficulty": 1},
            {"word": "Submarine", "hint": "Underwater vessel exploring the deep", "difficulty": 2},
            {"word": "Solar Panel", "hint": "Converts sunlight directly into electricity", "difficulty": 2}
        ]
    },
    "nature": {
        "name": "🌲 Nature, Weather & Places",
        "words": [
            {"word": "Volcano", "hint": "Mountain erupting molten hot lava", "difficulty": 1},
            {"word": "Rainbow", "hint": "Colorful arch in sky after rainfall", "difficulty": 1},
            {"word": "Waterfall", "hint": "River cascading down steep cliff", "difficulty": 1},
            {"word": "Lighthouse", "hint": "Tower beaming light to guide ships", "difficulty": 2},
            {"word": "Campfire", "hint": "Outdoor fire for warmth & marshmallows", "difficulty": 1},
            {"word": "Cactus", "hint": "Desert plant covered in sharp prickles", "difficulty": 1},
            {"word": "Snowman", "hint": "Figure sculpted from snow with carrot nose", "difficulty": 1},
            {"word": "Island", "hint": "Land surrounded completely by ocean", "difficulty": 1},
            {"word": "Windmill", "hint": "Mill with revolving sails driven by wind", "difficulty": 2},
            {"word": "Lightning", "hint": "Sudden electrical discharge during storm", "difficulty": 1},
            {"word": "Pyramid", "hint": "Ancient triangular monument in Egypt", "difficulty": 1},
            {"word": "Tornado", "hint": "Violently rotating column of air", "difficulty": 2},
            {"word": "Castle", "hint": "Fortified medieval stone fortress", "difficulty": 2},
            {"word": "Sunflower", "hint": "Tall yellow flower tracking the sun", "difficulty": 1},
            {"word": "Cave", "hint": "Dark hollow chamber inside a mountain", "difficulty": 2},
            {"word": "Coral Reef", "hint": "Underwater ecosystem built by colonies", "difficulty": 3},
            {"word": "Glacier", "hint": "Slow moving gigantic mass of ice", "difficulty": 2},
            {"word": "Oasis", "hint": "Fertile spot with water in a desert", "difficulty": 3},
            {"word": "Mushroom", "hint": "Fungus with a cap and stem", "difficulty": 1},
            {"word": "Bridge", "hint": "Structure spanning across a river or valley", "difficulty": 1}
        ]
    },
    "fantasy": {
        "name": "✨ Fantasy & Adventure",
        "words": [
            {"word": "Dragon", "hint": "Mythical giant fire-breathing beast", "difficulty": 1},
            {"word": "Unicorn", "hint": "Magical horse with a spiraled horn", "difficulty": 1},
            {"word": "Treasure Chest", "hint": "Wooden box filled with gold coins & gems", "difficulty": 2},
            {"word": "Wizard", "hint": "Magician with a pointed hat and wand", "difficulty": 1},
            {"word": "Pirate", "hint": "Sea adventurer with eye patch & parrot", "difficulty": 1},
            {"word": "Mermaid", "hint": "Half human, half fish aquatic dweller", "difficulty": 2},
            {"word": "Magic Wand", "hint": "Slender rod channeling magical spells", "difficulty": 1},
            {"word": "Crown", "hint": "Jeweled headpiece worn by royalty", "difficulty": 1},
            {"word": "Knight", "hint": "Armored warrior on horseback", "difficulty": 2},
            {"word": "Ghost", "hint": "Spooky translucent floating spirit", "difficulty": 1},
            {"word": "Sword", "hint": "Bladed weapon with a hilt", "difficulty": 1},
            {"word": "Shield", "hint": "Defensive armor held to block attacks", "difficulty": 1},
            {"word": "Genie", "hint": "Spirit emerging from a magic lamp", "difficulty": 2},
            {"word": "Potion", "hint": "Magical glowing elixir in a glass flask", "difficulty": 2},
            {"word": "Vampire", "hint": "Nocturnal creature with sharp fangs", "difficulty": 2},
            {"word": "Phoenix", "hint": "Mythical bird reborn from ashes", "difficulty": 3},
            {"word": "Pegasus", "hint": "Mythical winged divine horse", "difficulty": 3},
            {"word": "Spellbook", "hint": "Ancient tome inscribed with incantations", "difficulty": 2}
        ]
    }
}

BOT_DOODLES = {
    "Pizza": [
        {"tool": "brush", "color": "#f39c12", "size": 6, "points": [[0.5, 0.2], [0.2, 0.75], [0.8, 0.75], [0.5, 0.2]]},
        {"tool": "brush", "color": "#d35400", "size": 8, "points": [[0.2, 0.75], [0.8, 0.75]]},
        {"tool": "brush", "color": "#c0392b", "size": 10, "points": [[0.45, 0.45], [0.46, 0.45]]},
        {"tool": "brush", "color": "#c0392b", "size": 10, "points": [[0.55, 0.58], [0.56, 0.58]]},
        {"tool": "brush", "color": "#c0392b", "size": 10, "points": [[0.35, 0.65], [0.36, 0.65]]},
        {"tool": "brush", "color": "#27ae60", "size": 4, "points": [[0.4, 0.5], [0.42, 0.52], [0.45, 0.48]]}
    ],
    "Sun": [
        {"tool": "brush", "color": "#f1c40f", "size": 8, "points": [[0.5, 0.35], [0.4, 0.42], [0.38, 0.55], [0.45, 0.65], [0.55, 0.65], [0.62, 0.55], [0.6, 0.42], [0.5, 0.35]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.5, 0.28], [0.5, 0.15]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.5, 0.72], [0.5, 0.85]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.28, 0.5], [0.15, 0.5]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.72, 0.5], [0.85, 0.5]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.35, 0.35], [0.25, 0.25]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.65, 0.65], [0.75, 0.75]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.65, 0.35], [0.75, 0.25]]},
        {"tool": "brush", "color": "#e67e22", "size": 4, "points": [[0.35, 0.65], [0.25, 0.75]]}
    ],
    "Rocket": [
        {"tool": "brush", "color": "#95a5a6", "size": 6, "points": [[0.5, 0.15], [0.4, 0.35], [0.4, 0.65], [0.6, 0.65], [0.6, 0.35], [0.5, 0.15]]},
        {"tool": "brush", "color": "#e74c3c", "size": 6, "points": [[0.5, 0.15], [0.42, 0.28], [0.58, 0.28], [0.5, 0.15]]},
        {"tool": "brush", "color": "#e74c3c", "size": 6, "points": [[0.4, 0.55], [0.28, 0.7], [0.4, 0.65]]},
        {"tool": "brush", "color": "#e74c3c", "size": 6, "points": [[0.6, 0.55], [0.72, 0.7], [0.6, 0.65]]},
        {"tool": "brush", "color": "#3498db", "size": 8, "points": [[0.5, 0.42], [0.51, 0.42]]},
        {"tool": "brush", "color": "#e67e22", "size": 5, "points": [[0.45, 0.66], [0.5, 0.82], [0.55, 0.66]]},
        {"tool": "brush", "color": "#f1c40f", "size": 4, "points": [[0.48, 0.66], [0.5, 0.76], [0.52, 0.66]]}
    ],
    "Castle": [
        {"tool": "brush", "color": "#7f8c8d", "size": 5, "points": [[0.25, 0.4], [0.35, 0.4], [0.35, 0.8], [0.25, 0.8], [0.25, 0.4]]},
        {"tool": "brush", "color": "#7f8c8d", "size": 5, "points": [[0.65, 0.4], [0.75, 0.4], [0.75, 0.8], [0.65, 0.8], [0.65, 0.4]]},
        {"tool": "brush", "color": "#95a5a6", "size": 5, "points": [[0.35, 0.5], [0.65, 0.5], [0.65, 0.8], [0.35, 0.8]]},
        {"tool": "brush", "color": "#e74c3c", "size": 4, "points": [[0.23, 0.4], [0.3, 0.28], [0.37, 0.4]]},
        {"tool": "brush", "color": "#e74c3c", "size": 4, "points": [[0.63, 0.4], [0.7, 0.28], [0.77, 0.4]]},
        {"tool": "brush", "color": "#34495e", "size": 6, "points": [[0.46, 0.8], [0.46, 0.68], [0.54, 0.68], [0.54, 0.8]]}
    ],
    "Default": [
        {"tool": "brush", "color": "#3498db", "size": 6, "points": [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7], [0.3, 0.3]]},
        {"tool": "brush", "color": "#e74c3c", "size": 4, "points": [[0.3, 0.3], [0.7, 0.7]]},
        {"tool": "brush", "color": "#2ecc71", "size": 4, "points": [[0.7, 0.3], [0.3, 0.7]]}
    ]
}
