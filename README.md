# light-studio

### Project source
https://cgi8150.freecluster.eu/projecto-03-light-studio.html

---

# Requirements

### Scene constitution
- [x] um objecto primitivo, dos fornecidos na pasta libs, com uma transformação de modelação nula (matriz identidade).
- [x] Um cubo, deformado num paralelepípedo com as dimensões de 3 x 0.1 x 3, transformado de modo a que a face superior fique em y=-0.5. O material deste cubo é fixo e as suas propriedades podem ser escolhidas livremente por si.
- [ ] 1 ou mais luzes controladas pelo utilizador usando uma interface implementada usando a biblioteca dat.gui.



### User 
- [ ] ligar/desligar o método de remoção de faces ocultas conhecido pelo método do produto interno (ou back face culling);
- [x]   ligar/desligar o método de remoção de faces ocultas conhecido pelo nome de z-buffer (ou depth buffer);
- [ ]  ligar/desligar a visualização das localizações dos pontos de luz (desenhados como pequenas esferas em wireframe e sem iluminação);
- [x]    escolher, em qualquer altura, qual o objeto que pretende visualizar (esfera, cilindro, torus, pirâmide ou cubo);
- [x]    alterar as características do material aplicado ao objeto (Ka, Kd, Ks e shininess);
- [ ]   cada fonte de luz poderá ser ligada/desligada, parametrizada para ser pontual ou direcional. Se for pontual o utilizador pode controlar a sua posição na cena (em World Coordinates). Se for direcional, o utilizador pode definir a direção dessa mesma luz (na realidade definirá um vetor com a direção oposta, apontando da cena para o local de onde a luz provém);
  
- [ ]    A assinatura espectral de cada fonte de luz também deverá poder ser modificada (intensidades r, g e b para cada um dos termos do modelo de iluminação - ambiente, difusa e especular)
  
- [x]   manipular a posição e orientação da câmara, de forma semelhante à pedida nos exercícios da aula prática 10, bastando contudo utilizar os sliders da interface e não sendo necessário qualquer mecanismo baseado em gestos executados com rato sobre o canvas.
 -> PODE SER MELHORADO
