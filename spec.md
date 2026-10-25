# Ruzzle for most used 2k words in language
---
## The goal of the application
You open and choose a language where you will have to insert the most used 2k words
This will have multiple modalities:
- you have the world in you main language and with ruzzle keys you have to find the correct world in the destination language
- the other way around, from the goal language to your language
- in a phrase (both ways)
- extra in those when you select the wrong word from the possible that you can compose with the ruzzle keyboard it will open a pop-up with the word composed, the translation to the other language and the definition to make the user understand. It must be clear it is the wrong word anyway
- it should open the same pop-up but clearly showing that is correct (with color) that is correct and also the definition
- there should be a section where you choose you progress
- there should a section where you can choose between languages
- the user can study/ use multiple languages at the same time  in the account switching between one and another in the language/settings page. No multiple language together and mixed in between
- The user should be able to chose his main language and then the language he wants to learn
- the goal for now is learning from italian and english to languages that are: english, italian spanish german and french (off course no italian to italian and english to english)

## Style of the UI:
- playful like slot machine and stuff to make it addictive
- so points, sounds and letters should move a little when passing over, kinda like the real ruzzle
- we should predispose a point system based on time used to find the word and possible additional word even if not correct
- the word and the keyboard should change once the correct one is found
- there should be a main menu with simple colourful buttons to chose between modalities

## Technical specs
On a technical standpoint this should be:
- PWA written with vuejs using composition style
- the css should be modular and easy to change
- there should be a dark and light mode with a switch in the setting so plan the css accordingly with the 2 themes
- In this this first version there is no backend so everything must be loaded in the frontend
- this will be published via github pages so there should be a workflow publishing it when merged on master automatically
- the json with the most popular 2k word with language should be shipped in the frontend
