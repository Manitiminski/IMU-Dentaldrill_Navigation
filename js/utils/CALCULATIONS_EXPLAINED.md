# Math explained: Quaternions
The math required in this project relies on utilizing quaternions to represent rotations in 3D space. This document aims to provide some explanation and example for better understanding of the concept.


## Basics - Quaternion

A quarternion is a vital mathematical tool used to represent rotations in 3D space, with advantages over Euler angles.

A quaternion $ Q $ can be expressed as:

$$
Q = q_0 + q_1 i + q_2 j + q_3 k
$$

Where:
- $ q_0 $ is the scalar part.
- $ (q_1, q_2, q_3) $ represents the vector part.
- $ i, j, k $ are the fundamental quaternion units.

### Important Properties of Quaternions

- **Order of Multiplication Matters:** The order in which quarternions are multiplied is significant:
   $$ 
   Q_1 \cdot Q_2 \neq Q_2 \cdot Q_1 
   $$

- **Inversion:** Inverting a quaternion effectively "undoes" its rotation, allowing you to switch from one reference frame to another. This is crucial for calculating relative orientations, as it cancels out the effects of the quaternion's rotation.



## Example 1 Scenario

### Context

Let's imagine we navigate a spaceship through the galaxy. The orientations of both the spaceship and a nearby planet are represented by quaternions:

- **Ship's orientation:** $ Q_{\text{ship}} $ relative to the galaxy's coordinate system
- **Planet's orientation:** $ Q_{\text{planet}} $ also relative to the galaxy's coordinate system

### Objective

We want to determine the orientation of the ship relative to the planet.

### Step-by-Step Calculation

1. **Current Situation:**
   - $ Q_{\text{ship}} $ (ship's orientation)
   - $ Q_{\text{planet}} $ (planet's orientation)

2. **Calculate the Inverse of the Planet's Quaternion:**
    - Compute $ Q_{\text{planet}}^{-1} $ to "undo" the planet's rotation, allowing us to transition into the planet's frame of reference.


3. **Compute Ship's Orientation Relative to the Planet:**
    - Apply the ship's orientation within planet's frame of reference by multiplying the frame with the ship's orientation, whereby the order of multiplication is crucial:
        $$ Q_{\text{planet}}^{-1} \cdot Q_{\text{ship}} $$

    - This allows to express the orientation of the ship as if it were observed from the planet's perspective.

4. **Complete:**
    - The combined formula gives us the ship's orientation relative to the planet:
        $$ Q_{\text{ship relative to planet}} = Q_{\text{planet}}^{-1} \cdot Q_{\text{ship}} $$

    - This formula can be applied to any two objects in 3D space to determine their relative orientations.
    Rewritten for general use:
        $$ Q_{\text{A relative to B}} = Q_{\text{B}}^{-1} \cdot Q_{\text{A}} $$

    - The result is a quaternion representing the orientation of object A as if it were observed from object B's perspective. The orientation is now in a local frame defined by object B.



## Example 2 Scenario

### Context

We now have two spaceships, each with its orientation represented by quaternions:

- **Ship A's orientation:** $ Q_{\text{A}} $ relative to the galaxy's coordinate system
- **Ship B's orientation:** $ Q_{\text{B}} $ relative to the galaxy's coordinate system

### Objective

1. Align both spaceships to face the same direction with same orientation, so they can fly in formation. We have to determine what rotation Ship B needs to apply to match Ship A's orientation. Ship A does not need to change its orientation.
2. After saying goodbye, Ship A will make a 45° turn to the left, while Ship B will make a 30° turn to the right and 10° up. We need the required rotations for both ships.
3. Calculate the relative orientation of Ship A to Ship B after these rotations.


### Step-by-Step Calculation

1. **Current Situation:**
   - $ Q_{\text{A}} $ (ship A's orientation, unchanged)
   - $ Q_{\text{B}} $ (ship B's orientation, to be adjusted)

1. **Calculate the Rotation Quaternion to Align Ship B with Ship A:**
    - Since we want Ship B to change its orientation we calculate the quaternion that represents the rotation Ship B needs to apply to match Ship A's orientation.

        $$ Q_{\text{rotation B}} = Q_{\text{A}} \cdot Q_{\text{B}}^{-1} $$

1. **Apply Rotation to Ship B:**
    - Apply the calculated rotation to Ship B to align it with Ship A.

        $$ Q_{\text{B aligned}} = Q_{\text{rotation B}} \cdot Q_{\text{B}} $$
    - Ship B should now effectively have the same orientation as Ship A.

3. **Determine Ships' Required Rotations for New Course**
    - .....
    - .....
      
    
    







### References

For further reading on quaternions and their applications, consider these resources:
- [Quaternions and Rotations](https://graphics.stanford.edu/courses/cs348a-17-winter/Papers/quaternion.pdf) 
- [Quaternion Rotation](https://en.wikipedia.org/wiki/Quaternion_rotation) 
