import unittest
from engine import Game, Item

class Rules(unittest.TestCase):
    def game(self):
        g = Game(duration=0)
        g.spawn_in = 100
        return g

    def test_catch_once_even_two_hands(self):
        g=self.game(); g.items=[Item(100,100,40,100,0)]
        hands=[(90,150,160,190)]*2
        self.assertEqual(len(g.update(.2,hands)),1)
        g.update(.2,hands)
        self.assertEqual((g.score,g.caught,g.missed),(1,1,0))

    def test_miss_negative_once(self):
        g=self.game(); g.items=[Item(0,535,40,100,0)]
        g.update(.1,[]); g.update(.1,[])
        self.assertEqual((g.score,g.missed),(-1,1))

    def test_no_catch_outside_horizontal(self):
        g=self.game(); g.items=[Item(400,100,40,100,0)]
        g.update(.2,[(90,150,160,190)])
        self.assertEqual(g.score,0)

    def test_swept_collision(self):
        g=self.game(); g.items=[Item(100,0,40,1000,0)]
        g.update(.2,[(90,150,160,190)])
        self.assertEqual(g.score,1)

    def test_cannot_catch_after_below_hand(self):
        g=self.game(); g.items=[Item(100,200,40,100,0)]
        g.update(.1,[(90,150,160,190)])
        self.assertEqual(g.score,0)

    def test_finished_and_reset(self):
        g=Game(duration=1); g.update(2,[])
        self.assertTrue(g.finished)
        old=g.elapsed; self.assertEqual(g.update(1,[]),[])
        self.assertEqual(g.elapsed,old)
        g.reset(); self.assertEqual(g.score,0); self.assertFalse(g.finished)

if __name__=='__main__': unittest.main()
