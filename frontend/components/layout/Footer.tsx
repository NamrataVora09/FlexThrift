export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="row gx-5">
          <div className="col-lg-4 col-md-6">
            <h2 className="footer-brand">Flex Market</h2>
            <p className="footer-description">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec
              ullamcorper mattis, pulvinar dapibus leo.
            </p>
          </div>

          <div className="col-lg-2 col-md-6">
            <h5 className="footer-heading">Quick Links</h5>
            <ul className="footer-links">
              <li><a href="#">Home</a></li>
              <li><a href="#">About</a></li>
              <li><a href="#">Sell</a></li>
              <li><a href="#">Rent</a></li>
              <li><a href="#">Explore</a></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5 className="footer-heading">Categories</h5>
            <ul className="footer-links">
              <li><a href="#">All</a></li>
              <li><a href="#">Clothes</a></li>
              <li><a href="#">Accessories</a></li>
              <li><a href="#">Footwear</a></li>
              <li><a href="#">Electronics</a></li>
              <li><a href="#">Furniture</a></li>
              <li><a href="#">Home appliances</a></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h5 className="footer-heading">Our policies</h5>
            <ul className="footer-links">
              <li><a href="#">Return policies</a></li>
              <li><a href="#">Cancellation policies</a></li>
              <li><a href="#">Terms of uses</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="copyright">Copyright © 2025 Flex Market. All rights reserved.</div>
    </footer>
  );
}
